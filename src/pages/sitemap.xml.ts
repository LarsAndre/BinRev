import type { APIRoute } from 'astro';
import { publishedNotes } from '../lib/content';

export const GET: APIRoute = async ({ site }) => {
  const paths = ['/', '/about/', '/analyses/', '/resources/',
    ...(await publishedNotes()).map(entry => entry.data.url)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${new URL(path, site)}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
