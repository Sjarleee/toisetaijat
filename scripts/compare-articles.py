#!/usr/bin/env python3
import re, os

with open('Takeout/Blogger/Blogs/Toiset Aijat/feed.atom', 'r', encoding='utf-8') as f:
    content = f.read()

feed_entries = {}
parts = content.split('<entry>')
for part in parts[1:]:
    title_m = re.search(r'<title[^>]*>(.*?)</title>', part, re.DOTALL)
    title = title_m.group(1) if title_m else ''
    link_m = re.search(r"rel='alternate'[^>]*href='([^']*)'", part)
    url = link_m.group(1) if link_m else ''
    slug = url.rstrip('/').split('/')[-1].replace('.html','') if url else ''
    content_m = re.search(r'<content[^>]*>([\s\S]*?)</content>', part)
    raw_len = len(content_m.group(1)) if content_m else 0
    if slug:
        feed_entries[slug] = (title, raw_len)

articles_dir = 'src/content/articles'
header = '{:<55} {:>10} {:>10} {:>7}'.format('Fil', 'Fil-tegn', 'Feed-tegn', 'Ratio')
print(header)
print('-' * 90)
for fname in sorted(os.listdir(articles_dir)):
    if not fname.endswith(('.mdx', '.md')):
        continue
    slug = fname.replace('.mdx','').replace('.md','')
    fpath = os.path.join(articles_dir, fname)
    with open(fpath) as f:
        file_len = len(f.read())
    if slug in feed_entries:
        title, feed_len = feed_entries[slug]
        ratio = file_len / feed_len if feed_len else 0
        flag = ' <<<' if ratio < 0.5 else ''
        print('{:<55} {:>10} {:>10} {:>7.2f}{}'.format(fname, file_len, feed_len, ratio, flag))
    else:
        print('{:<55} {:>10} {:>10}'.format(fname, file_len, '(ikke i feed)'))
