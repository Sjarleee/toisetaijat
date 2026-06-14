/**
 * migrate-images.mjs
 * 
 * 1. Parser feed.atom og finner bilder per post
 * 2. Matcher CDN-URL-filnavn mot Takeout-album
 * 3. Kopierer bilder til public/images/<artikkel-slug>/
 * 4. Oppdaterer artikkelfrontmatter med heroImage
 * 5. Legger inline-bilder tilbake i artikkelinnhold
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const FEED_PATH = join(ROOT, 'Takeout/Blogger/Blogs/Toiset Aijat/feed.atom');
const ALBUM_PATH = join(ROOT, 'Takeout/Blogger/Albums/Toiset Aijat');
const ARTICLES_PATH = join(ROOT, 'src/content/articles');
const PUBLIC_IMAGES_PATH = join(ROOT, 'public/images');

// Dekod URL-kodet filnavn tilbake til faktisk filnavn (håndterer dobbel-koding)
function decodeFilename(encoded) {
  try {
    let s = encoded.replace(/\+/g, ' ');
    s = decodeURIComponent(s);
    // Dekod igjen hvis fortsatt URL-kodet (dobbel-koding i Blogger CDN-URLer)
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
      s = s.replace(/\+/g, ' ');
      s = decodeURIComponent(s);
    }
    return s;
  } catch {
    return encoded;
  }
}

// Sanitiser filnavn for bruk i public/images/ (behold finske tegn, erstatt problematiske tegn)
function sanitizeFilename(name) {
  return name
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/[^a-zA-Z0-9æøåÆØÅäöüÄÖÜ.\-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

// Trekk ut alle bilder (CDN-src) fra en HTML-streng
function extractImages(html) {
  const images = [];
  // Matcher src="..." og src='...' for blogger CDN
  const srcRegex = /src=["'](https:\/\/blogger\.googleusercontent\.com\/img\/[^"']+)["']/g;
  let m;
  while ((m = srcRegex.exec(html)) !== null) {
    images.push(m[1]);
  }
  return images;
}

// Trekk ut filnavn fra CDN-URL (siste del etter /)
function getFilenameFromCdnUrl(url) {
  const lastSlash = url.lastIndexOf('/');
  let filename = url.substring(lastSlash + 1);
  // Fjern size-suffiks som =w640-h380
  filename = filename.replace(/=[sw]\d+[^.]*$/, '');
  filename = filename.replace(/=[^.]*$/, '');
  return decodeFilename(filename);
}

// Finn faktisk fil i Takeout-album (håndterer URL-koding og finske tegn)
function findInAlbum(decodedFilename) {
  const albumFile = join(ALBUM_PATH, decodedFilename);
  if (existsSync(albumFile)) return albumFile;
  
  // Prøv med sanitisert navn (hvis filen ikke finnes direkte)
  return null;
}

// Map post-URL til artikkel-slug
function urlToSlug(url) {
  const m = url.match(/\/(\d{4}\/\d{2}\/[^.]+)\.html/);
  if (!m) return null;
  return m[1].replace(/\d{4}\/\d{2}\//, '');
}

// Parser feed.atom og returnerer liste over posts med bilder
function parseFeed() {
  const xml = readFileSync(FEED_PATH, 'utf-8');
  const posts = [];
  
  // Finn alle <entry> blokker
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let em;
  while ((em = entryRegex.exec(xml)) !== null) {
    const entry = em[1];
    
    // Bruk blogger:filename for å finne URL-stien
    const filenameMatch = entry.match(/<blogger:filename>([^<]+)<\/blogger:filename>/);
    if (!filenameMatch) continue;
    const bloggerPath = filenameMatch[1]; // f.eks. /2020/08/pohjanmaan-ratsukomppania-1620-ja-1630.html
    
    // Finn tittelen
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';
    
    // Finn innhold
    const contentMatch = entry.match(/<content type='html'>([\s\S]*?)<\/content>/);
    if (!contentMatch) continue;
    
    // Dekod HTML-entities i innhold
    const rawContent = contentMatch[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    const images = extractImages(rawContent);
    if (images.length === 0) continue;
    
    const slug = urlToSlug(bloggerPath);
    if (!slug) continue;
    
    posts.push({ url: bloggerPath, slug, title, images });
  }
  
  return posts;
}

// Konverter HTML img-tag kontekst til markdown
function imgToMarkdown(cdnUrl, altText = '') {
  const filename = getFilenameFromCdnUrl(cdnUrl);
  const sanitized = sanitizeFilename(filename);
  return { filename, sanitized };
}

// Les og oppdater en artikkelfil
function updateArticleFile(slug, heroImagePath, inlineImages) {
  const articleFile = join(ARTICLES_PATH, `${slug}.md`);
  if (!existsSync(articleFile)) {
    console.log(`  ⚠ Fant ikke artikkel: ${slug}.md`);
    return;
  }
  
  let content = readFileSync(articleFile, 'utf-8');
  
  // Sjekk om heroImage allerede er satt
  if (content.includes('heroImage:')) {
    console.log(`  ℹ heroImage allerede satt i ${slug}.md`);
  } else {
    // Legg til heroImage i frontmatter
    content = content.replace(
      /(---\n[\s\S]*?)(tags:)/,
      `$1heroImage: '${heroImagePath}'\n$2`
    );
    writeFileSync(articleFile, content, 'utf-8');
    console.log(`  ✓ Oppdaterte heroImage i ${slug}.md`);
  }
}

// Hoved-funksjon
async function main() {
  console.log('Starter bildemigrering...\n');
  
  // Opprett public/images/ om den ikke finnes
  if (!existsSync(PUBLIC_IMAGES_PATH)) {
    mkdirSync(PUBLIC_IMAGES_PATH, { recursive: true });
  }
  
  const posts = parseFeed();
  console.log(`Fant ${posts.length} posts med bilder i feed.atom\n`);
  
  let totalCopied = 0;
  let totalMissing = 0;
  
  for (const post of posts) {
    console.log(`\n[${post.slug}]`);
    console.log(`  "${post.title}" — ${post.images.length} bilde(r)`);
    
    // Opprett mappe for artikkelen
    const articleImagesDir = join(PUBLIC_IMAGES_PATH, post.slug);
    mkdirSync(articleImagesDir, { recursive: true });
    
    let heroImagePath = null;
    const copiedImages = [];
    
    for (const cdnUrl of post.images) {
      const filename = getFilenameFromCdnUrl(cdnUrl);
      
      // Hopp over rene hash-URLer (ingen lesbart filnavn)
      if (filename.startsWith('AVvXsE')) {
        console.log(`  ~ Hopper over hash-bilde`);
        continue;
      }
      
      const albumFilePath = findInAlbum(filename);
      
      if (albumFilePath) {
        const sanitized = sanitizeFilename(filename);
        const destPath = join(articleImagesDir, sanitized);
        
        if (!existsSync(destPath)) {
          copyFileSync(albumFilePath, destPath);
          console.log(`  ✓ Kopierte: ${filename} → /images/${post.slug}/${sanitized}`);
          totalCopied++;
        } else {
          console.log(`  ○ Allerede kopiert: ${sanitized}`);
        }
        
        copiedImages.push({ cdnUrl, localPath: `/images/${post.slug}/${sanitized}` });
        if (!heroImagePath) {
          heroImagePath = `/images/${post.slug}/${sanitized}`;
        }
      } else {
        console.log(`  ✗ Ikke funnet i album: ${filename}`);
        totalMissing++;
      }
    }
    
    // Oppdater artikkel med heroImage
    if (heroImagePath) {
      updateArticleFile(post.slug, heroImagePath, copiedImages);
    }
  }
  
  console.log('\n=== FERDIG ===');
  console.log(`Kopierte: ${totalCopied} bilder`);
  console.log(`Mangler:  ${totalMissing} bilder`);
  console.log('\nKjør "npm run build" for å verifisere.');
}

main().catch(console.error);
