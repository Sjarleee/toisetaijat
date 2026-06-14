# Toiset Aijat

Nettsted for Matti J. Kankaanpään kirjallisuus- ja muistosivulle.
Bygget med [Astro](https://astro.build) + Tailwind CSS, hostet på Cloudflare Pages.

## Lokal utvikling

```bash
npm install
npm run dev
```

Åpne http://localhost:4321

## Publisere ny artikkel

### Enkel måte (via CMS i nettleser)
1. Gå til `https://www.toisetaijat.fi/admin/`
2. Logg inn med GitHub
3. Klikk "Ny artikkeli", fyll ut og publiser
4. Cloudflare Pages bygger automatisk (ca. 1 minutt)

### Manuell måte
1. Lag fil i `src/content/articles/min-artikkel.md`
2. Bruk dette formatet øverst:
```
---
title: 'Artikkelin otsikko'
description: 'Lyhyt kuvaus'
pubDate: 2026-01-15
tags: ['historia', 'sukututkimus']
---

Artikkelin sisältö tähän...
```
3. Push til GitHub → Cloudflare Pages deployer automatisk

## Deploy til Cloudflare Pages

### Første gang
1. Lag GitHub-repository og push koden dit
2. Gå til [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
3. Klikk "Create a project" → Connect to Git → velg repo
4. Build-innstillinger:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Klikk "Save and Deploy"
6. Koble til domenet `toisetaijat.fi` under Custom Domains

### Decap CMS oppsett
1. Oppdater `public/admin/config.yml` med ditt GitHub-brukernavn
2. Sett opp [Sveltia CMS Auth](https://github.com/sveltia/sveltia-cms-auth) 
   som Cloudflare Worker for GitHub OAuth
3. Legg til OAuth-callback-URL i GitHub App-innstillinger

## Filstruktur

```
src/
  content/
    articles/     ← Markdown-artikler her
  layouts/        ← Sidemaler
  components/     ← Nav, Footer
  pages/          ← Alle URL-er
public/
  admin/          ← Decap CMS
  _redirects      ← Omdirigerer gamle Blogger-URL-er
```
