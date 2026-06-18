// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
// https://astro.build/config
export default defineConfig({
  site: 'https://www.toisetaijat.fi',
  output: 'static',
  i18n: {
    defaultLocale: 'fi',
    locales: ['fi', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => ![
        'https://www.toisetaijat.fi/tilaus/',
        'https://www.toisetaijat.fi/tilaus-vahvistettu/',
        'https://www.toisetaijat.fi/ostoskori/',
        'https://www.toisetaijat.fi/haku/',
      ].includes(page),
    }),
  ],
});