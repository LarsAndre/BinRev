import type { APIRoute } from 'astro';
import { publishedNotes, summary } from '../lib/content';

export const GET: APIRoute = async () => {
  const entries = (await publishedNotes()).map(entry => ({
    title: entry.data.title,
    url: entry.data.url,
    category: entry.data.sectionTitle,
    description: summary(entry),
    text: `${entry.data.tags.join(' ')} ${entry.body || ''}`,
  }));
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } });
};
