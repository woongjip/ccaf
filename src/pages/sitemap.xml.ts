import type { APIRoute } from 'astro';

const pages = import.meta.glob('./**/*.astro');
export const GET: APIRoute = async ({ site }) => {
  const { getCollection } = await import('astro:content');
  const urls = new Set<string>();
  for (const k of Object.keys(pages)) {
    if (k.includes('[')) continue;
    urls.add(k.replace('./', '/').replace(/index\.astro$/, '').replace(/\.astro$/, ''));
  }
  (await getCollection('pages')).forEach((p) => urls.add('/' + p.id));
  (await getCollection('notices')).forEach((n) => urls.add('/notice/' + n.id));
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map((u) => `  <url><loc>${new URL(u, site)}</loc></url>`).join('\n')}\n</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
