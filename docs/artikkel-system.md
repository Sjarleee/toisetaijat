# Artikkel-system – toisetaijat

## Formål

Nettstedet publiserer artikler skrevet av Matti J. Kankaanpää om finsk slektsforskning og militærhistorie. Det finnes en database med ca. 1900 artikler. De fleste er ikke publisert på nettstedet, men kan publiseres stykkevis når det er relevant (f.eks. som del av et produkt, en temaside eller et hakemisto-oppslag).

---

## Mappestruktur

```
src/content/articles/        ← publiserte MDX-artikler (vises på /artikkelit/)
articles/                    ← råmateriale (PDF-filer, originaldokumenter)
  Karjalan Ratsurykmentti/
  Uudenmaan Ratsurykmentti/
  Viipurin läänintilit/
```

---

## Artikkel-format (MDX frontmatter)

Alle artikler i `src/content/articles/` er `.mdx`-filer med dette frontmatter-skjemaet:

```yaml
---
title: "Artikkelin otsikko"
description: "Lyhyt kuvaus"
pubDate: 2024-01-15          # påkrevd – ISO-dato
updatedDate: 2024-02-01      # valgfri
heroImage: "/images/..."     # valgfri
tags:
  - ratsuvaki
  - sukututkimus
sourceUrl: "https://..."     # valgfri – opprinnelig URL (f.eks. Blogger)
draft: false                 # true = ikke synlig på /artikkelit/
blocks:                      # valgfri – strukturerte blokker
  - type: product
    bookId: suomalainen-ratsuvaki
---
```

### `draft: true` – ikke-publisert

Sett `draft: true` for å lagre artikkelen i systemet uten å vise den på `/artikkelit/`. Den er da tilgjengelig via direkte URL og kan refereres fra hakemisto, men vises ikke i artikkellisten.

Typisk bruk:
- Artikkelen finnes som PDF og selges, men teksten ikke ønskes fritt tilgjengelig
- Artikkelen er under ferdigstilling

---

## Blokker (`blocks`-feltet)

Strukturerte elementer som kan legges inn i artikkelen:

| type | Felt | Beskrivelse |
|------|------|-------------|
| `product` | `bookId` | Vis produktkort for en bok/artikkelsamling |
| `figure` | `image`, `caption`, `size`, `placement` | Bilde med bildetekst |
| `callout` | `text`, `variant` (note/tip/warning) | Fremhevet tekstboks |

---

## Publiseringsflyt – fra database til nettsted

### 1. Finn riktig artikkel

Artiklene finnes som originaltekster (Blogger-eksport, Word-dokumenter, PDF) i:
- `Takeout/Blogger/` – eksporterte blogginnlegg
- `articles/<Samling>/` – PDF-artikler solgt som produkter

### 2. Opprett MDX-fil

Filnavn: slugifisert tittel, f.eks. `ruoveden-komppanian-miehet.mdx`

Lag filen i `src/content/articles/` med riktig frontmatter. Innholdet kan konverteres fra HTML/tekst.

### 3. Koble til hakemisto (valgfritt)

Hvis artikkelen skal dukke opp i hakemisto-søket, opprett en YAML-fil i `src/content/hakemisto/` med:

```yaml
title: "Hakemistomerkintä"
description: "Kuvaus"
reference:
  type: article
  id: artikkelin-slug    # = filnavnet uten .mdx
persons:
  - Erkki Matinpoika
places:
  - Ruovesi
```

### 4. Koble til produktsalg (valgfritt)

For PDF-artikler som selges kan artikkelen fungere som landingsside med `blocks: [{type: product, bookId: ...}]`.

---

## Sammenheng med matti-indexer

`matti-indexer` er et separat repo som prosesserer Mattis upubliserte forskningsnotater (ca. 1900 tekst-filer) og genererer YAML-indekser for hakemisto-systemet.

### Hva matti-indexer gjør

1. Leser `.txt`-filer fra `output/<mappe>/` (esipolvi, kirkonkj, talot, tiedot, suvut)
2. Ekstraherer personnavn, steder, hendelser med regex eller LLM
3. Skriver YAML til `output/yaml/<mappe>.yaml`
4. Disse YAML-filene kopieres til `src/content/hakemisto/` i toisetaijat

### Relasjon til artikkeldatabasen

Matti-indexer indekserer **upublisert forskningsaineisto** – ikke de publiserte artiklene. Koblingen skjer via `reference`-feltet i hakemisto-YAML:

```yaml
reference:
  type: unpublished
  label: "Sukututkimusaineisto – SUVUT-kokoelma"
  note: "Ota yhteyttä lisätietoja varten."
```

Når en hakemisto-treff kobles til en **publisert artikkel** i stedet, brukes:

```yaml
reference:
  type: article
  id: artikkelin-slug
```

### Arbeidsflyt: fra indeksert aineisto til publisert artikkel

1. `matti-indexer` genererer hakemisto-YAML med `type: unpublished`
2. Redaktør identifiserer tema som er relevant å publisere som artikkel
3. Redaktør oppretter MDX-fil i `src/content/articles/`
4. Hakemisto-YAML oppdateres: `type: unpublished` → `type: article`, `id: <slug>`

---

## Eksempel: publisere én artikkel fra PDF-samling

```bash
# 1. Konverter PDF til tekst (om nødvendig)
pdftotext "articles/Karjalan Ratsurykmentti/KRR 1643.pdf" /tmp/krr-1643.txt

# 2. Opprett artikkelfil
# src/content/articles/karjalan-ratsurykmentti-1643.mdx

# 3. Oppdater hakemisto (om finnes)
# src/content/hakemisto/krr-1643.yaml
#   reference:
#     type: article
#     id: karjalan-ratsurykmentti-1643
```

---

## Tekniske detaljer

- Artikkellisten (`/artikkelit/`) filtrerer ut `draft: true`-artikler
- Slug = filnavnet uten `.mdx`, f.eks. `dna-ja-sukututkimus`
- Direkte URL: `/artikkelit/<slug>`
- Støtter MDX-komponenter via `BlockRenderer.astro`
