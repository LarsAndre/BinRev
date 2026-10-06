import type { APIRoute } from 'astro';
import { publishedAnalyses, summary } from '../lib/analyses';
import { resources } from '../lib/catalog';

export const GET: APIRoute = async () => {
  const analyses = (await publishedAnalyses()).map(entry => ({
    title: entry.data.title,
    url: `/analyses/${entry.id}/`,
    category: 'Analysis',
    description: summary(entry),
    text: `${entry.data.tags.join(' ')} ${entry.body || ''}`,
  }));
  return new Response(JSON.stringify([...analyses, ...resources.map(resource => ({
    title: resource.title,
    url: `/resources/${resource.slug}/`,
    category: resource.category,
    description: resource.description,
    text: resource.description,
  }))]), { headers: { 'Content-Type': 'application/json' } });
};
