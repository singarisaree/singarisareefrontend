import type { MetadataRoute } from 'next';
import { SITE_URL, API_BASE_URL } from '@/lib/api-origin';

async function fetchSlugs(path: string): Promise<Array<{ slug: string; updatedAt?: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json.data as Array<{ slug: string; updatedAt?: string }>;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  const staticPages: MetadataRoute.Sitemap = [
    '',
    '/collections',
    '/about',
    '/contact',
    '/search',
    '/privacy-policy',
    '/data-deletion',
    '/terms',
    '/refund-policy',
    '/shipping-policy',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));

  const [products, categories] = await Promise.all([
    fetchSlugs('/products?limit=500&isActive=true'),
    fetchSlugs('/categories'),
  ]);

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/product/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/category/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
