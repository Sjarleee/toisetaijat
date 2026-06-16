import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('product'),
    bookId: z.string(),
  }),
  z.object({
    type: z.literal('figure'),
    image: z.string(),
    caption: z.string().optional(),
    size: z.enum(['full', 'medium', 'small']).default('full'),
    placement: z.enum(['center', 'left', 'right']).default('center'),
  }),
  z.object({
    type: z.literal('callout'),
    text: z.string(),
    variant: z.enum(['note', 'tip', 'warning']).default('note'),
  }),
]);

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    sourceUrl: z.string().url().optional(),
    draft: z.boolean().default(false),
    blocks: z.array(blockSchema).optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // etusivu
    heroSubtitle: z.string().optional(),
    shippingNotice: z.string().optional(),
    shippingNoticeVisible: z.boolean().optional(),
    vatRate: z.string().optional(),
    // myynissa
    introText: z.string().optional(),
    deliveryNote: z.string().optional(),
    // kirjat
    contactNote: z.string().optional(),
    // matti-j-kankaanpaa
    photo: z.string().optional(),
    photoAlt: z.string().optional(),
    photoCaption: z.string().optional(),
    photoPlacement: z.enum(['right', 'left', 'top', 'full']).optional(),
    // ota-yhteytta
    name: z.string().optional(),
    address: z.string().optional(),
    email: z.string().optional(),
    deliveryInfo: z.string().optional(),
    businessId: z.string().optional(),
  }),
});

const books = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/books' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    productType: z.enum(['book', 'ebook', 'single-article', 'bundle']),
    year: z.number(),
    isbn: z.string().optional(),
    pages: z.string().optional(),
    publisher: z.string().optional(),
    image: z.string().optional(),
    price: z.number().optional(),
    shippingPrice: z.number().optional(),
    availability: z.enum(['available', 'ask', 'soldout', 'external', 'ebook-only']),
    orderUrl: z.string().optional(),
    articleUrl: z.string().optional(),
    ebookUrl: z.string().optional(),
    ebookLabel: z.string().optional(),
    ebookPrice: z.number().optional(),
    externalUrl: z.string().optional(),
    note: z.string().optional(),
    bundleBookIds: z.array(z.string()).optional(),
    bundleDiscount: z.number().optional(),
    sortOrder: z.number().optional(),
  }),
});

const articleCollections = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/article-collections' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pricePerArticle: z.number(),
    priceAll: z.number(),
    articleCount: z.number(),
    orderUrl: z.string().optional(),
    articleUrl: z.string().optional(),
    sortOrder: z.number().optional(),
    articles: z.array(z.string()),
  }),
});

const hakemisto = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/hakemisto' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    reference: z.discriminatedUnion('type', [
      z.object({ type: z.literal('book'), id: z.string() }),
      z.object({ type: z.literal('article'), id: z.string() }),
      z.object({ type: z.literal('article-collection'), id: z.string() }),
      z.object({ type: z.literal('unpublished'), label: z.string(), note: z.string().optional() }),
    ]),
    persons: z.array(z.string()).default([]),
    places: z.array(z.string()).default([]),
    events: z.array(z.string()).default([]),
    regiments: z.array(z.string()).default([]),
    families: z.array(z.string()).default([]),
    other: z.array(z.string()).default([]),
  }),
});

export const collections = { articles, pages, books, articleCollections, hakemisto };
