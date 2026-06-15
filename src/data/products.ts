/**
 * Produkttyper og hjelpefunksjoner.
 * Produktdata lagres nå i src/content/books/ og src/content/article-collections/ (YAML-filer).
 * Bruk getCollection('books') og getCollection('articleCollections') i sider.
 */

import type { CollectionEntry } from 'astro:content';

export interface BookProduct {
  id: string;
  title: string;
  description: string;
  year: number;
  isbn?: string;
  pages?: string;
  publisher?: string;
  image?: string;
  price?: number;
  shippingPrice?: number;
  availability: 'available' | 'ask' | 'soldout' | 'external' | 'ebook-only';
  orderUrl?: string;
  articleUrl?: string;
  ebook?: {
    price?: number;
    url: string;
    label?: string;
  };
  externalUrl?: string;
  note?: string;
}

export interface ArticleCollection {
  id: string;
  title: string;
  description: string;
  pricePerArticle: number;
  priceAll: number;
  articleCount: number;
  orderUrl: string;
  articleUrl?: string;
  articles: string[];
}

export function entryToBook(entry: CollectionEntry<'books'>): BookProduct {
  const d = entry.data;
  return {
    id: entry.id,
    title: d.title,
    description: d.description ?? '',
    year: d.year,
    isbn: d.isbn,
    pages: d.pages,
    publisher: d.publisher,
    image: d.image,
    price: d.price,
    shippingPrice: d.shippingPrice,
    availability: d.availability,
    orderUrl: d.orderUrl,
    articleUrl: d.articleUrl,
    ebook: d.ebookUrl ? { url: d.ebookUrl, label: d.ebookLabel, price: d.ebookPrice } : undefined,
    externalUrl: d.externalUrl,
    note: d.note,
  };
}

export function entryToCollection(entry: CollectionEntry<'articleCollections'>): ArticleCollection {
  const d = entry.data;
  return {
    id: entry.id,
    title: d.title,
    description: d.description ?? '',
    pricePerArticle: d.pricePerArticle,
    priceAll: d.priceAll,
    articleCount: d.articleCount,
    orderUrl: d.orderUrl,
    articleUrl: d.articleUrl,
    articles: d.articles,
  };
}


