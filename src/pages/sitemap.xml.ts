import type { APIRoute } from 'astro';
import { publishedAnalyses } from '../lib/analyses';
import { resources } from '../lib/catalog';

export const GET: APIRoute = async ({ site }) => {
  const paths = ['/', '/analyses/', '/resources/',
    ...(await publishedAnalyses()).map(entry => `/analyses/${entry.id}/`),
    ...resources.map(resource => `/resources/${resource.slug}/`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${new URL(path, site)}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
