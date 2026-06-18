import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const sorted = articles.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: 'Toiset Aijat',
    description:
      'Matti J. Kankaanpään kirjallisuus- ja muistosivu – sukututkimus, historia, kirjat',
    site: context.site!,
    items: sorted.map((a) => ({
      title: a.data.title,
      pubDate: a.data.pubDate,
      description: a.data.description,
      link: `/artikkelit/${a.id}/`,
    })),
    customData: '<language>fi-FI</language>',
  });
}
