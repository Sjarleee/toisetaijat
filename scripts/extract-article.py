#!/usr/bin/env python3
import re, sys, html

FEED = 'Takeout/Blogger/Blogs/Toiset Aijat/feed.atom'
slug = sys.argv[1] if len(sys.argv) > 1 else 'soini'

with open(FEED, 'r', encoding='utf-8') as f:
    content = f.read()

# Split on entry boundaries manually
parts = content.split('<entry>')
print(f'Total entries (approx): {len(parts)-1}')

for part in parts[1:]:
    if slug.lower() not in part.lower():
        continue
    end = part.find('</entry>')
    entry = part[:end] if end != -1 else part

    title_m = re.search(r'<title[^>]*>(.*?)</title>', entry, re.DOTALL)
    title = title_m.group(1) if title_m else 'N/A'

    link_m = re.search(r"rel='alternate'[^>]*href='([^']*)'", entry)
    url = link_m.group(1) if link_m else 'N/A'

    content_m = re.search(r"<content type='html'>([\s\S]*?)</content>", entry)
    raw = content_m.group(1) if content_m else ''

    print(f'TITLE: {title}')
    print(f'URL: {url}')
    print(f'CONTENT LENGTH: {len(raw)}')
    print('--- CONTENT START ---')
    print(raw)
    print('--- CONTENT END ---')
