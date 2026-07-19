import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/api-origin';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/checkout', '/order/', '/my-orders'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
