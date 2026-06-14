/** Convert a tag display name to a URL-safe slug */
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Reverse lookup: find original tag from slug */
export function slugToTag(slug: string, allTags: string[]): string | undefined {
  return allTags.find(t => tagToSlug(t) === slug);
}
