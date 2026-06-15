#!/usr/bin/env python3
"""
migrate-all.py
Migrates ALL live POST entries from the Blogger feed.atom to Astro MDX files.
No filtering — everything gets migrated.
Usage: python3 scripts/migrate-all.py
"""

import re
import html as htmllib
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
FEED = ROOT / 'Takeout/Blogger/Blogs/Toiset Aijat/feed.atom'
OUT_DIR = ROOT / 'src/content/articles'

# ── Already manually migrated (skip re-creating) ─────────────────────────────
EXISTING_SLUGS = {
    'kirjojen-tilaaminen-2026',
    'ison-vihan-aika-suomessa',
    'dna-ja-sukututkimus',
    'onko-sukututkimustieteella-omaa-metodia',
    'pohjanmaan-ratsukomppania-1620-ja-1630',
    'ala-honkajoen-ruotusotamiehet',
    'sukututkimuksen-maaritelma',
    'esipolvet-ja-jalkipolvet-toisilleen-vastakkaisia',
    'vilhunen-vilhuinen',
    'turun-ja-porin-laanin-ratsurykmentin-vapaakomppania',
    'karl-frosteruksen-tytar-vappu',
    'kuka-oli-se-soini',
    'sukututkimuksen-teoria-ja-kaytanto',
    'lisanimista-kuulopuheita-suomeksi',
    'pieni-loyto-kartalta',
    'kuka-olli-v-j-heino',
    'virrat-150-vuotta-1867-2017-kuvin-ja-sanoin',
    'sota-kansallisin-joukoin',
    'sukututkijan-ongelma-oliko-kantaisa-mauri-vai-mayra',
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(text):
    t = text.lower()
    for a, b in [('ä','a'),('ö','o'),('å','a'),('é','e'),('è','e'),('ü','u'),('ú','u'),('ó','o'),('á','a')]:
        t = t.replace(a, b)
    t = re.sub(r'[^a-z0-9\s-]', '', t).strip()
    t = re.sub(r'\s+', '-', t)
    t = re.sub(r'-+', '-', t)
    return t[:60].rstrip('-')


def html_to_markdown(raw_html):
    h = htmllib.unescape(raw_html)
    # Remove style/script
    h = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', h, flags=re.IGNORECASE)
    h = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', h, flags=re.IGNORECASE)
    # Remove HTML comments
    h = re.sub(r'<!--[\s\S]*?-->', '', h)
    # Headings
    h = re.sub(r'<h1[^>]*>([\s\S]*?)</h1>', r'# \1\n\n', h, flags=re.IGNORECASE)
    h = re.sub(r'<h2[^>]*>([\s\S]*?)</h2>', r'## \1\n\n', h, flags=re.IGNORECASE)
    h = re.sub(r'<h3[^>]*>([\s\S]*?)</h3>', r'### \1\n\n', h, flags=re.IGNORECASE)
    h = re.sub(r'<h4[^>]*>([\s\S]*?)</h4>', r'#### \1\n\n', h, flags=re.IGNORECASE)
    # Bold / italic
    h = re.sub(r'<strong[^>]*>([\s\S]*?)</strong>', r'**\1**', h, flags=re.IGNORECASE)
    h = re.sub(r'<b[^>]*>([\s\S]*?)</b>', r'**\1**', h, flags=re.IGNORECASE)
    h = re.sub(r'<em[^>]*>([\s\S]*?)</em>', r'*\1*', h, flags=re.IGNORECASE)
    h = re.sub(r'<i[^>]*>([\s\S]*?)</i>', r'*\1*', h, flags=re.IGNORECASE)
    # Links
    h = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>', r'[\2](\1)', h, flags=re.IGNORECASE)
    h = re.sub(r"<a[^>]*href='([^']*)'[^>]*>([\s\S]*?)</a>", r'[\2](\1)', h, flags=re.IGNORECASE)
    # Images — remove (no local copies)
    h = re.sub(r'<img[^>]*>', '', h, flags=re.IGNORECASE)
    # Paragraphs and divs
    h = re.sub(r'</p>', '\n\n', h, flags=re.IGNORECASE)
    h = re.sub(r'<p[^>]*>', '', h, flags=re.IGNORECASE)
    h = re.sub(r'</div>', '\n', h, flags=re.IGNORECASE)
    h = re.sub(r'<div[^>]*>', '', h, flags=re.IGNORECASE)
    # Line breaks
    h = re.sub(r'<br\s*/?>', '\n', h, flags=re.IGNORECASE)
    # Lists
    h = re.sub(r'<ul[^>]*>', '', h, flags=re.IGNORECASE)
    h = re.sub(r'</ul>', '\n', h, flags=re.IGNORECASE)
    h = re.sub(r'<ol[^>]*>', '', h, flags=re.IGNORECASE)
    h = re.sub(r'</ol>', '\n', h, flags=re.IGNORECASE)
    h = re.sub(r'<li[^>]*>([\s\S]*?)</li>', r'- \1\n', h, flags=re.IGNORECASE)
    # Blockquote
    h = re.sub(r'<blockquote[^>]*>([\s\S]*?)</blockquote>', r'> \1\n\n', h, flags=re.IGNORECASE)
    # Horizontal rules
    h = re.sub(r'<hr\s*/?>', '\n---\n', h, flags=re.IGNORECASE)
    # Spans / remaining tags
    h = re.sub(r'<[^>]+>', '', h)
    # Non-breaking spaces
    h = h.replace('\u00a0', ' ')
    # Collapse excessive blank lines
    h = re.sub(r'\n{4,}', '\n\n\n', h)
    return h.strip()


def extract_tag(xml, tag):
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml, re.IGNORECASE)
    return m.group(1).strip() if m else ''


def yaml_str(s):
    """Wrap a string safely for YAML — use double-quotes, escape inner double-quotes."""
    s = s.replace('\\', '\\\\').replace('"', '\\"')
    return f'"{s}"'


# ── Parse ─────────────────────────────────────────────────────────────────────

feed_text = FEED.read_text(encoding='utf-8')
entries = re.findall(r'<entry>([\s\S]*?)</entry>', feed_text)
print(f'Found {len(entries)} total entries in feed.atom\n')

created = 0
skipped_existing = 0
slug_counter = {}  # track duplicate slugs
new_redirects = []  # (old_url_path, new_slug)

for entry in entries:
    status = extract_tag(entry, 'blogger:status')
    btype = extract_tag(entry, 'blogger:type')
    if status != 'LIVE' or btype != 'POST':
        continue

    title = extract_tag(entry, 'title')
    title = htmllib.unescape(title).strip()
    if not title:
        continue

    pub_raw = extract_tag(entry, 'published')
    pub_date = pub_raw[:10] if pub_raw else '2000-01-01'

    # Original Blogger URL
    link_m = re.search(r"<link rel='alternate'[^>]*href='([^']*)'", entry)
    source_url = link_m.group(1) if link_m else ''

    # Derive slug: prefer URL slug, fallback to title slug
    if source_url:
        url_slug = source_url.split('/')[-1].replace('.html', '')
    else:
        url_slug = slugify(title)

    # Check if already manually migrated (exact or prefix match)
    if url_slug in EXISTING_SLUGS:
        print(f'  SKIP (already migrated): {url_slug}')
        skipped_existing += 1
        continue

    # Handle duplicate slugs by appending the year
    year = pub_date[:4]
    base_slug = url_slug
    if base_slug in slug_counter:
        # Append year to disambiguate
        candidate = f'{base_slug}-{year}'
        if candidate in slug_counter:
            candidate = f'{base_slug}-{year}-{slug_counter[base_slug]}'
        slug_counter[base_slug] += 1
        url_slug = candidate
    slug_counter[base_slug] = slug_counter.get(base_slug, 0) + 1

    out_path = OUT_DIR / f'{url_slug}.mdx'

    # Don't overwrite manually edited files
    if out_path.exists():
        print(f'  SKIP (file exists): {url_slug}.mdx')
        skipped_existing += 1
        continue

    # Content
    content_m = re.search(r"<content type='html'>([\s\S]*?)</content>", entry)
    raw_html = content_m.group(1) if content_m else ''
    markdown = html_to_markdown(raw_html)

    # Description: first non-empty paragraph, max 200 chars
    first_para = next(
        (p.strip() for p in markdown.split('\n\n') if len(p.strip()) > 30 and not p.strip().startswith('#')),
        title
    )
    description = re.sub(r'[\*_\[\]\(\)]', '', first_para).replace('\n', ' ')[:200].rstrip()

    frontmatter = '\n'.join(filter(None, [
        '---',
        f'title: {yaml_str(title)}',
        f'description: {yaml_str(description)}',
        f'pubDate: {pub_date}',
        f'sourceUrl: {yaml_str(source_url)}' if source_url else None,
        'tags: []',
        '---',
    ]))

    file_content = f'{frontmatter}\n\n{markdown}\n'
    out_path.write_text(file_content, encoding='utf-8')
    print(f'  CREATED [{pub_date}]: {url_slug}.mdx')
    created += 1

    # Record redirect needed
    if source_url:
        old_path = '/' + '/'.join(source_url.split('/')[-4:])  # /YYYY/MM/slug.html
        new_redirects.append((old_path, f'/artikkelit/{url_slug}'))

print(f'\n✓ Done: {created} created, {skipped_existing} already existed\n')

# Print new redirects to add to _redirects
if new_redirects:
    print('# ── Add these to public/_redirects ──────────────────────────────')
    for old, new in sorted(new_redirects):
        print(f'{old} {new} 301')
