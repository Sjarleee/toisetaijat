#!/usr/bin/env node
// parse-blogger.mjs
// Parses the Google Takeout Blogger feed.atom and generates Astro markdown files.
// Usage: node scripts/parse-blogger.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FEED_PATH = join(ROOT, 'Takeout/Blogger/Blogs/Toiset Aijat/feed.atom');
const OUT_DIR = join(ROOT, 'src/content/articles');

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/å/g, 'a')
    .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
    .replace(/-$/, '');
}

function htmlToMarkdown(html) {
  return html
    // Decode XML entities first
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Remove style/script blocks
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Headings
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
    // Bold / italic
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    // Images — drop them (no local copies available)
    .replace(/<img[^>]*>/gi, '')
    // Paragraphs and divs → double newlines
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Lists
    .replace(/<ul[^>]*>/gi, '').replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '').replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    // Blockquote
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n')
    // Horizontal rules
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    // Strip any remaining tags
    .replace(/<[^>]+>/g, '')
    // Collapse excessive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function extractTag(xml, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractAttr(xml, tagName, attr) {
  const re = new RegExp(`<${tagName}[^>]*${attr}="([^"]*)"`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

// ── Known articles already migrated (skip re-creating) ───────────────────────
const EXISTING_FILES = new Set(
  [
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
  ]
);

// Posts we know are NOT articles (product pages, event notices, annual summaries)
// Matched against the URL slug portion
const SKIP_URL_PATTERNS = [
  /vuonna-200/, /vuonna-201/, /vuonna-202/, // annual summaries
  /1999/, /vuonna-2000/, /vuonna-2001/,
  /kuulutko-sukuuni/,
  /terveiset-vantaalta/,
  /otaniemessa-sukututkimusviikolla/,
  /ratsuvakikirja-julkistettiin/,
  /kevattalven-mietteita/,
  /tulossa-syksylla-kirja/,
  /hyvaa-uutta-vuotta/,
  /isokakkonen-i-on-vuoden-sukukirja/,
  // product/book pages
  /karjalan-ratsurykmentti/,
  /lundin-taistelu/,
  /toiset-aijat-i/, /toiset-aijat-ii/,
  /viipurin-ja-savonlinnan/, /viipurin-laanintilit/,
  /ruoveden-ja-keuruun/,
  /suur-ruoveden-vanhimmat/,
  /kimaltelevilta-vesilta/,
  /ruoveden-komppanian-miehet/,
  /karjalainen-karilainen/,
  /suomalainen-ratsuvaki-ruotsin-ajalla/,
  /porin-laanin-jalkavakirykmentin/,
  /kirjoja-vanhan-ruoveden/,
  /matti-j-kankaanpaa-on-kuolut/,
  /kirja-suomalaisesta-ratsuvaesta/,
  /uudenmaan-ratsurykmentti/,
  /suuri-pohjansota-iso-viha/,
  /kirjojen-tilaaminen/,
];

// ── Parse entries ─────────────────────────────────────────────────────────────

const xml = readFileSync(FEED_PATH, 'utf-8');

// Split on <entry> boundaries
const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
let match;
const entries = [];
while ((match = entryRe.exec(xml)) !== null) {
  entries.push(match[1]);
}

console.log(`Found ${entries.length} entries total`);

let created = 0;
let skipped = 0;
let alreadyExists = 0;

for (const entry of entries) {
  // Only process published posts
  const status = extractTag(entry, 'blogger:status');
  const type = extractTag(entry, 'blogger:type');
  if (status !== 'LIVE' || type !== 'POST') { skipped++; continue; }

  const title = extractTag(entry, 'title')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  if (!title) { skipped++; continue; }

  // Get published date
  const published = extractTag(entry, 'published');
  if (!published) { skipped++; continue; }
  const pubDate = published.substring(0, 10); // YYYY-MM-DD

  // Get the alternate link (original blog URL)
  const linkMatch = entry.match(/<link rel='alternate'[^>]*href='([^']*)'[^>]*>/);
  const sourceUrl = linkMatch ? linkMatch[1] : '';

  // Derive slug from URL
  const urlSlug = sourceUrl
    ? sourceUrl.replace(/.*\//, '').replace('.html', '')
    : slugify(title);

  // Check skip patterns
  const shouldSkip = SKIP_URL_PATTERNS.some(pat => pat.test(urlSlug));
  if (shouldSkip) { skipped++; continue; }

  // Check if already manually migrated
  if (EXISTING_FILES.has(urlSlug)) { alreadyExists++; continue; }

  // Get content
  const contentMatch = entry.match(/<content type='html'>([\s\S]*?)<\/content>/);
  const rawHtml = contentMatch ? contentMatch[1] : '';
  const markdown = htmlToMarkdown(rawHtml);

  // Skip if content is too short (likely a stub or product page)
  if (markdown.length < 200) {
    console.log(`  SKIP (too short, ${markdown.length} chars): ${title}`);
    skipped++;
    continue;
  }

  // Generate filename
  const filename = urlSlug + '.md';
  const outPath = join(OUT_DIR, filename);

  if (existsSync(outPath)) {
    alreadyExists++;
    continue;
  }

  // Generate description from first paragraph
  const firstPara = markdown.split('\n\n').find(p => p.trim().length > 30 && !p.startsWith('#'));
  const description = firstPara
    ? firstPara.replace(/\n/g, ' ').replace(/[*_\[\]]/g, '').substring(0, 160).trim()
    : title;

  // Escape single quotes in title/description for YAML
  const safeTitle = title.replace(/'/g, "\\'");
  const safeDesc = description.replace(/'/g, "\\'");

  const frontmatter = [
    '---',
    `title: '${safeTitle}'`,
    `description: '${safeDesc}'`,
    `pubDate: ${pubDate}`,
    sourceUrl ? `sourceUrl: '${sourceUrl}'` : null,
    `tags: []`,
    '---',
  ].filter(Boolean).join('\n');

  const fileContent = `${frontmatter}\n\n${markdown}\n`;

  writeFileSync(outPath, fileContent, 'utf-8');
  console.log(`  CREATED [${pubDate}]: ${filename}`);
  created++;
}

console.log(`\nDone: ${created} created, ${alreadyExists} already existed, ${skipped} skipped`);
