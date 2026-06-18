#!/usr/bin/env python3
"""
translate-articles.py — Translate Finnish MDX articles to English using DeepL API.

Usage:
    python scripts/translate-articles.py [--api-key KEY] [--slug SLUG] [--force]

Requirements:
    pip install deepl pyyaml

The DEEPL_API_KEY env var is used if --api-key is not given.
Free-tier DeepL key (500k chars/month) is sufficient for most use.

Behaviour:
- Reads all .mdx and .md files from src/content/articles/
- Translates title, description, tags + body prose via DeepL (FI → EN-GB)
- Preserves MDX/Markdown structure: frontmatter fields, import statements,
  component tags (<Figure .../>, <ProductCard .../> etc.) are NOT translated
- Writes to src/content/articles-en/ with the same filename
- Skips files that already exist in articles-en/ unless --force is given
- Also translates the 8 pages from src/content/pages/ to src/content/pages-en/
  (only text fields, preserves YAML keys and non-translatable values)
"""

import argparse
import os
import re
import sys
from pathlib import Path

try:
    import deepl
except ImportError:
    print("ERROR: deepl package not found. Run: pip install deepl pyyaml")
    sys.exit(1)

try:
    import yaml
except ImportError:
    print("ERROR: pyyaml not found. Run: pip install deepl pyyaml")
    sys.exit(1)

ROOT = Path(__file__).parent.parent
ARTICLES_FI = ROOT / "src" / "content" / "articles"
ARTICLES_EN = ROOT / "src" / "content" / "articles-en"
PAGES_FI = ROOT / "src" / "content" / "pages"
PAGES_EN = ROOT / "src" / "content" / "pages-en"

# MDX component tag pattern — lines starting with < are kept verbatim
COMPONENT_LINE_RE = re.compile(r"^\s*<[A-Z]")
# Import lines
IMPORT_LINE_RE = re.compile(r"^\s*import\s+")
# Frontmatter delimiters
FM_DELIM = "---"


def split_frontmatter(text: str):
    """Split file into (frontmatter_str, body_str). Returns (None, text) if no FM."""
    if not text.startswith(FM_DELIM):
        return None, text
    end = text.find(FM_DELIM, 3)
    if end == -1:
        return None, text
    fm = text[3:end].strip()
    body = text[end + 3:].lstrip("\n")
    return fm, body


def translate_text(translator: deepl.Translator, text: str) -> str:
    """Translate a single string from Finnish to English."""
    if not text or not text.strip():
        return text
    result = translator.translate_text(text, source_lang="FI", target_lang="EN-GB")
    return result.text


def translate_body(translator: deepl.Translator, body: str) -> str:
    """
    Translate MDX body prose. Preserves:
    - Lines starting with < (component tags)
    - Lines starting with import
    - Empty lines
    - Fenced code blocks (``` ... ```)
    Translates everything else as prose paragraphs.
    """
    lines = body.split("\n")
    translated_lines = []
    in_code_block = False
    prose_buffer = []

    def flush_prose():
        if not prose_buffer:
            return
        prose_text = "\n".join(prose_buffer)
        if prose_text.strip():
            translated_prose = translate_text(translator, prose_text)
            translated_lines.extend(translated_prose.split("\n"))
        else:
            translated_lines.extend(prose_buffer)
        prose_buffer.clear()

    for line in lines:
        if line.startswith("```"):
            flush_prose()
            in_code_block = not in_code_block
            translated_lines.append(line)
            continue

        if in_code_block:
            translated_lines.append(line)
            continue

        if COMPONENT_LINE_RE.match(line) or IMPORT_LINE_RE.match(line):
            flush_prose()
            translated_lines.append(line)
            continue

        prose_buffer.append(line)

    flush_prose()
    return "\n".join(translated_lines)


def translate_article(translator: deepl.Translator, src: Path, dst: Path, force: bool):
    if dst.exists() and not force:
        print(f"  SKIP  {src.name} (already exists, use --force to overwrite)")
        return

    print(f"  TRANSLATE  {src.name} → {dst.name}")
    text = src.read_text(encoding="utf-8")
    fm_str, body = split_frontmatter(text)

    if fm_str is None:
        # No frontmatter — translate whole file as body
        translated_body = translate_body(translator, body)
        dst.write_text(translated_body, encoding="utf-8")
        return

    fm = yaml.safe_load(fm_str) or {}

    # Translate text frontmatter fields
    if "title" in fm and fm["title"]:
        fm["title"] = translate_text(translator, str(fm["title"]))
    if "description" in fm and fm["description"]:
        fm["description"] = translate_text(translator, str(fm["description"]))
    if "tags" in fm and fm["tags"]:
        fm["tags"] = [translate_text(translator, str(t)) for t in fm["tags"]]

    # Add fiSlug pointing back to Finnish original
    fm["fiSlug"] = src.stem

    # Translate body
    translated_body = translate_body(translator, body)

    # Reconstruct file
    new_fm = yaml.dump(fm, allow_unicode=True, default_flow_style=False, sort_keys=False).strip()
    output = f"---\n{new_fm}\n---\n\n{translated_body}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(output, encoding="utf-8")
    print(f"         written {dst}")


def translate_page(translator: deepl.Translator, src: Path, dst: Path, force: bool,
                   text_fields: list[str]):
    """Translate specific text fields in a pages Markdown file."""
    if dst.exists() and not force:
        print(f"  SKIP  {src.name} (already exists)")
        return

    print(f"  TRANSLATE PAGE  {src.name}")
    text = src.read_text(encoding="utf-8")
    fm_str, body = split_frontmatter(text)

    if fm_str is None:
        dst.write_text(text, encoding="utf-8")
        return

    fm = yaml.safe_load(fm_str) or {}

    for field in text_fields:
        if field in fm and fm[field] and isinstance(fm[field], str):
            fm[field] = translate_text(translator, fm[field])

    translated_body = translate_body(translator, body) if body.strip() else body

    new_fm = yaml.dump(fm, allow_unicode=True, default_flow_style=False, sort_keys=False).strip()
    output = f"---\n{new_fm}\n---\n\n{translated_body}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(output, encoding="utf-8")


# Fields to translate per pages file
PAGE_TRANSLATE_FIELDS = {
    "etusivu.md": ["title", "description", "heroSubtitle", "shippingNotice"],
    "myynissa.md": ["title", "description", "introText", "deliveryNote"],
    "kirjat.md": ["title", "description", "introText", "contactNote"],
    "matti-j-kankaanpaa.md": ["title", "description", "photoAlt", "photoCaption"],
    "ota-yhteytta.md": ["title", "description", "deliveryInfo"],
    "tekijanoikeus.md": ["title", "description"],
    "toimitusehdot.md": ["title", "description"],
    "tietosuoja.md": ["title", "description"],
}


def main():
    parser = argparse.ArgumentParser(description="Translate Finnish articles to English via DeepL")
    parser.add_argument("--api-key", help="DeepL API key (or set DEEPL_API_KEY env var)")
    parser.add_argument("--slug", help="Only translate this specific article slug")
    parser.add_argument("--force", action="store_true", help="Overwrite existing translations")
    parser.add_argument("--pages-only", action="store_true", help="Only translate pages, not articles")
    parser.add_argument("--articles-only", action="store_true", help="Only translate articles, not pages")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("DEEPL_API_KEY")
    if not api_key:
        print("ERROR: No DeepL API key. Pass --api-key or set DEEPL_API_KEY env var.")
        print("  Free tier: https://www.deepl.com/pro#developer")
        sys.exit(1)

    translator = deepl.Translator(api_key)
    usage = translator.get_usage()
    remaining = usage.character.limit - usage.character.count
    print(f"DeepL usage: {usage.character.count:,} / {usage.character.limit:,} chars used ({remaining:,} remaining)")

    ARTICLES_EN.mkdir(parents=True, exist_ok=True)
    PAGES_EN.mkdir(parents=True, exist_ok=True)

    # Translate articles
    if not args.pages_only:
        article_files = sorted(ARTICLES_FI.glob("**/*.{md,mdx}"))
        # Also support explicit glob
        article_files = sorted(list(ARTICLES_FI.glob("**/*.md")) + list(ARTICLES_FI.glob("**/*.mdx")))

        if args.slug:
            article_files = [f for f in article_files if f.stem == args.slug]
            if not article_files:
                print(f"No article found with slug: {args.slug}")
                sys.exit(1)

        print(f"\nTranslating {len(article_files)} article(s)...")
        for src in article_files:
            dst = ARTICLES_EN / src.name
            try:
                translate_article(translator, src, dst, args.force)
            except Exception as e:
                print(f"  ERROR translating {src.name}: {e}")

    # Translate pages
    if not args.articles_only:
        print(f"\nTranslating pages...")
        for filename, fields in PAGE_TRANSLATE_FIELDS.items():
            src = PAGES_FI / filename
            dst = PAGES_EN / filename
            if not src.exists():
                print(f"  MISSING  {src}")
                continue
            try:
                translate_page(translator, src, dst, args.force, fields)
            except Exception as e:
                print(f"  ERROR translating {filename}: {e}")

    print("\nDone.")


if __name__ == "__main__":
    main()
