import { SITE_URL } from '@/lib/api-origin';
import type { Category, Product } from '@/types';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Singari Sarees',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'Authentic handcrafted sarees — where every weave tells a story.',
  };
}

export function productJsonLd(product: Product) {
  const image = product.defaultImage || product.colors?.[0]?.images?.[0]?.url;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description?.slice(0, 500),
    image: image ? [image] : undefined,
    sku: product.sku,
    brand: { '@type': 'Brand', name: 'Singari Sarees' },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: product.effectivePrice ?? Number(product.price),
      availability: product.isOutOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function categoryBreadcrumbJsonLd(category: Category) {
  return breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Collections', path: '/collections' },
    { name: category.name, path: `/category/${category.slug}` },
  ]);
}
