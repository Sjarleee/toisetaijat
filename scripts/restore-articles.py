#!/usr/bin/env python3
"""
Restores article files from the Blogger feed where the file is significantly
shorter than the original feed content (likely AI-generated placeholder).
"""
import re, os

FEED = 'Takeout/Blogger/Blogs/Toiset Aijat/feed.atom'
ARTICLES_DIR = 'src/content/articles'

def html_to_markdown(html):
    md = html
    md = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'<!--[\s\S]*?-->', '', md)
    md = re.sub(r'<h1[^>]*>([\s\S]*?)</h1>', r'# \1\n\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<h2[^>]*>([\s\S]*?)</h2>', r'## \1\n\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<h3[^>]*>([\s\S]*?)</h3>', r'### \1\n\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<h4[^>]*>([\s\S]*?)</h4>', r'#### \1\n\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<strong[^>]*>([\s\S]*?)</strong>', r'**\1**', md, flags=re.IGNORECASE)
    md = re.sub(r'<b[^>]*>([\s\S]*?)</b>', r'**\1**', md, flags=re.IGNORECASE)
    md = re.sub(r'<em[^>]*>([\s\S]*?)</em>', r'*\1*', md, flags=re.IGNORECASE)
    md = re.sub(r'<i[^>]*>([\s\S]*?)</i>', r'*\1*', md, flags=re.IGNORECASE)
    md = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>', r'[\2](\1)', md, flags=re.IGNORECASE)
    md = re.sub(r"<a[^>]*href='([^']*)'[^>]*>([\s\S]*?)</a>", r'[\2](\1)', md, flags=re.IGNORECASE)
    md = re.sub(r'<img[^>]*>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'</p>', '\n\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<p[^>]*>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'</div>', '\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<div[^>]*>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'<br\s*/?>', '\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<ul[^>]*>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'</ul>', '\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<ol[^>]*>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'</ol>', '\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<li[^>]*>([\s\S]*?)</li>', r'- \1\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<blockquote[^>]*>([\s\S]*?)</blockquote>', r'> \1\n\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<span[^>]*>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'</span>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'<table[^>]*>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'</table>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'<tr[^>]*>', '', md, flags=re.IGNORECASE)
    md = re.sub(r'</tr>', '\n', md, flags=re.IGNORECASE)
    md = re.sub(r'<t[dh][^>]*>([\s\S]*?)</t[dh]>', r' \1 |', md, flags=re.IGNORECASE)
    md = re.sub(r'<[^>]+>', '', md)
    md = re.sub(r'\n{4,}', '\n\n\n', md)
    return md.strip()

def slugify(text):
    t = text.lower()
    for a, b in [('ä','a'),('ö','o'),('å','a'),('é','e'),('è','e'),('ü','u')]:
        t = t.replace(a, b)
    t = re.sub(r'[^a-z0-9\s-]', '', t)
    t = t.strip()
    t = re.sub(r'\s+', '-', t)
    t = re.sub(r'-+', '-', t)
    return t[:60].rstrip('-')

def normalize_title(t):
    return re.sub(r'\s+', ' ', t.strip().lower())

# Parse existing frontmatter from a file
def parse_frontmatter(text):
    if not text.startswith('---'):
        return {}, text
    end = text.find('\n---', 3)
    if end == -1:
        return {}, text
    fm_block = text[3:end].strip()
    body = text[end+4:].lstrip('\n')
    fm = {}
    for line in fm_block.split('\n'):
        m = re.match(r'^(\w+):\s*(.*)', line)
        if m:
            fm[m.group(1)] = m.group(2).strip()
    return fm, body

# Load feed
with open(FEED, 'r', encoding='utf-8') as f:
    content = f.read()

# Build feed map: normalized_title -> (title, pubdate, raw_html, raw_len)
feed_map = {}
parts = content.split('<entry>')
for part in parts[1:]:
    title_m = re.search(r'<title[^>]*>(.*?)</title>', part, re.DOTALL)
    title = title_m.group(1).strip() if title_m else ''
    title = title.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&#39;', "'").replace('&quot;', '"')

    status_m = re.search(r'<blogger:status>(.*?)</blogger:status>', part)
    btype_m = re.search(r'<blogger:type>(.*?)</blogger:type>', part)
    if not (status_m and status_m.group(1) == 'LIVE' and btype_m and btype_m.group(1) == 'POST'):
        continue

    content_m = re.search(r'<content[^>]*>([\s\S]*?)</content>', part)
    raw = content_m.group(1) if content_m else ''
    if not raw:
        continue

    pub_m = re.search(r'<published>(.*?)</published>', part)
    pubdate = pub_m.group(1)[:10] if pub_m else ''

    key = normalize_title(title)
    feed_map[key] = (title, pubdate, raw, len(raw))

print('Feed entries loaded: {}'.format(len(feed_map)))

# Process article files
restored = 0
skipped = 0

for fname in sorted(os.listdir(ARTICLES_DIR)):
    if not fname.endswith(('.mdx', '.md')):
        continue
    fpath = os.path.join(ARTICLES_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        file_text = f.read()

    fm, _ = parse_frontmatter(file_text)
    file_title = fm.get('title', '').strip("'\"")
    file_title_norm = normalize_title(file_title)

    # Try exact match first, then slug match
    feed_entry = feed_map.get(file_title_norm)

    # If no exact match, try matching by slug of title
    if not feed_entry:
        file_slug = slugify(file_title)
        for key, val in feed_map.items():
            if slugify(val[0]) == file_slug or slugify(key) == file_slug:
                feed_entry = val
                break

    if not feed_entry:
        print('  NO MATCH: {} (title: {})'.format(fname, file_title))
        skipped += 1
        continue

    feed_title, pubdate, raw_html, feed_raw_len = feed_entry
    file_len = len(file_text)

    # Only restore if feed is significantly longer (>1.5x)
    if feed_raw_len <= file_len * 1.5:
        print('  OK (similar size): {} ({} vs {} feed chars)'.format(fname, file_len, feed_raw_len))
        skipped += 1
        continue

    print('  RESTORING: {} ({} -> ~{} chars from feed)'.format(fname, file_len, feed_raw_len))

    # Decode entities and convert
    html = raw_html
    html = html.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', '\u00a0')
    md = html_to_markdown(html)

    # Build new frontmatter preserving existing tags/sourceUrl
    raw_tags = fm.get('tags', '[]').strip()
    tags = raw_tags if raw_tags and raw_tags != '' else '[]'
    source_url = fm.get('sourceUrl', '')
    safe_title = feed_title.replace("'", "\\'")

    # Build description from first real paragraph
    first_para = next((p.strip() for p in md.split('\n\n') if len(p.strip()) > 40 and not p.startswith('#')), feed_title)
    safe_desc = re.sub(r'[\*_\[\]]', '', first_para.replace("'", "\\'"))[:160]

    fm_lines = [
        '---',
        "title: '{}'".format(safe_title),
        "description: '{}'".format(safe_desc),
        'pubDate: {}'.format(pubdate),
    ]
    if source_url:
        fm_lines.append("sourceUrl: {}".format(source_url))
    fm_lines.append('tags: {}'.format(tags))
    fm_lines.append('---')

    new_text = '\n'.join(fm_lines) + '\n\n' + md + '\n'

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_text)

    restored += 1

print('\nDone: {} restored, {} skipped/no-match'.format(restored, skipped))
