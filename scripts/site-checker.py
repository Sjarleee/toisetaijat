#!/usr/bin/env python3
"""
site-checker.py — Crawl toisetaijat.fi and report 404s and other issues.

Usage:
    python scripts/site-checker.py [BASE_URL]

Defaults to https://www.toisetaijat.fi
Local dev:  python scripts/site-checker.py http://localhost:4321
"""

import sys
import time
import urllib.parse
from collections import defaultdict
from html.parser import HTMLParser

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print("Installer requests:  pip install requests")
    sys.exit(1)

BASE_URL = (sys.argv[1] if len(sys.argv) > 1 else "https://www.toisetaijat.fi").rstrip("/")

# ── Colours ──────────────────────────────────────────────────────────────────
RED    = "\033[91m"
YELLOW = "\033[93m"
GREEN  = "\033[92m"
GREY   = "\033[90m"
RESET  = "\033[0m"


# ── HTML parser ───────────────────────────────────────────────────────────────
class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []   # href values from <a> and <link>
        self.images = []  # src values from <img> and <source>

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "a" and "href" in d:
            self.links.append(d["href"])
        elif tag == "link" and "href" in d:
            self.links.append(d["href"])
        elif tag in ("img", "source") and "src" in d:
            self.images.append(d["src"])


# ── Helpers ───────────────────────────────────────────────────────────────────
def make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(total=2, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.mount("http://",  HTTPAdapter(max_retries=retry))
    s.headers["User-Agent"] = "toisetaijat-site-checker/1.0"
    return s


def normalise(href: str, base: str):
    href = href.strip()
    if not href or href.startswith(("mailto:", "tel:", "javascript:", "#", "//cdn-cgi/")):
        return None
    if href.startswith("//"):
        href = "https:" + href
    if not href.startswith("http"):
        href = urllib.parse.urljoin(base, href)
    # skip cloudflare internal paths
    if "/cdn-cgi/" in href:
        return None
    # strip fragment
    href = href.split("#")[0]
    return href.rstrip("/") or None


def is_internal(url: str) -> bool:
    return url.startswith(BASE_URL)


def fetch_status(session: requests.Session, url: str):
    """Return (status_code, final_url_or_error)."""
    try:
        r = session.head(url, timeout=12, allow_redirects=True)
        if r.status_code == 405:          # HEAD rejected → try GET
            r = session.get(url, timeout=12, allow_redirects=True, stream=True)
            r.close()
        return r.status_code, str(r.url)
    except requests.exceptions.ConnectionError as e:
        return None, f"connection error: {e}"
    except requests.exceptions.Timeout:
        return None, "timeout"
    except Exception as e:
        return None, str(e)


# ── Crawler ───────────────────────────────────────────────────────────────────
def crawl() -> int:
    session = make_session()

    # Pages to visit (internal HTML only)
    queue: list[str] = [BASE_URL + "/"]
    queued: set[str] = {BASE_URL + "/"}  # avoid duplicates in queue

    # External links checked once
    ext_checked: set[str] = set()

    # Results
    broken_internal: dict[str, list[tuple[str, int | str]]] = defaultdict(list)
    broken_external: dict[str, list[tuple[str, int | str]]] = defaultdict(list)

    pages_crawled = 0

    print(f"Crawler starter: {BASE_URL}\n")

    while queue:
        page_url = queue.pop(0)

        # ── Fetch page ────────────────────────────────────────────────────────
        try:
            r = session.get(page_url, timeout=15, allow_redirects=True)
        except Exception as e:
            broken_internal[page_url].append(("(start)", f"connection error: {e}"))
            print(f"{RED}FEIL{RESET} (connection) {page_url}")
            continue

        pages_crawled += 1
        st = r.status_code

        print(f"  {GREY}{st}{RESET}  {page_url}")

        if st >= 400:
            broken_internal[page_url].append(("(start)", st))
            continue

        ct = r.headers.get("content-type", "")
        if "html" not in ct:
            continue  # skip non-HTML (CSS, images, etc.)

        # ── Parse links ───────────────────────────────────────────────────────
        parser = LinkExtractor()
        try:
            parser.feed(r.text)
        except Exception:
            pass

        all_refs = [(h, "link")  for h in parser.links] + \
                   [(h, "image") for h in parser.images]

        for href, kind in all_refs:
            url = normalise(href, r.url)
            if url is None:
                continue

            if is_internal(url):
                if url not in queued:
                    queued.add(url)
                    queue.append(url)
            else:
                # Check each external URL once
                if url in ext_checked:
                    continue
                ext_checked.add(url)
                ext_st, _ = fetch_status(session, url)
                if ext_st is None or ext_st >= 400:
                    broken_external[url].append((page_url, ext_st or "error"))
                time.sleep(0.05)

        time.sleep(0.1)   # be polite to the server

    # ── Report ────────────────────────────────────────────────────────────────
    print(f"\n{'='*65}")
    print(f"Sider sjekket: {pages_crawled}")

    if broken_internal:
        print(f"\n{RED}INTERNE FEIL ({len(broken_internal)}):{RESET}")
        for url, refs in sorted(broken_internal.items()):
            for found_on, code in refs:
                print(f"  [{code}]  {url}")
                if found_on not in ("(start)",):
                    print(f"  {GREY}       funnet på: {found_on}{RESET}")
    else:
        print(f"\n{GREEN}Ingen interne feil!{RESET}")

    if broken_external:
        print(f"\n{YELLOW}EKSTERNE LENKE-FEIL ({len(broken_external)}):{RESET}")
        for url, refs in sorted(broken_external.items()):
            for found_on, code in refs:
                print(f"  [{code}]  {url}")
                print(f"  {GREY}       funnet på: {found_on}{RESET}")
    else:
        print(f"{GREEN}Ingen eksterne lenke-feil!{RESET}")

    print(f"{'='*65}\n")

    return len(broken_internal) + len(broken_external)


if __name__ == "__main__":
    sys.exit(crawl())
