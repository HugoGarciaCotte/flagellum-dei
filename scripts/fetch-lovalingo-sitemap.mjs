const SITEMAP_URL = 'https://cdn.lovalingo.com/sitemap/aix_jtfkxaj4v7ceb6k8z9j4qd8rxmh75c2t.xml';
const OUT_PATH = 'public/sitemap.xml';

const res = await fetch(SITEMAP_URL);
if (!res.ok) {
  console.error(`Failed to fetch sitemap: HTTP ${res.status}`);
  process.exit(1);
}

const body = await res.text();
const trimmed = body.trimStart();
if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<urlset') && !trimmed.startsWith('<sitemapindex')) {
  console.error('Invalid sitemap: body does not start with valid XML root');
  process.exit(1);
}

const { writeFileSync } = await import('node:fs');
writeFileSync(OUT_PATH, body, 'utf-8');
console.log(`Sitemap written to ${OUT_PATH}`);
