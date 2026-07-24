import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { API_BASE_URL } from '@/lib/api-origin';
import type { Category, CustomerReview, HeroBanner, Product, PublicSettings } from '@/types';

const API_URL = API_BASE_URL;

class ApiNotFoundError extends Error {
  constructor(path: string) {
    super(`API 404: ${path}`);
    this.name = 'ApiNotFoundError';
  }
}

async function rawGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      cache: 'no-store',
    });
  } catch {
    throw new Error('SERVER_UNREACHABLE');
  }

  if (res.status === 404) {
    throw new ApiNotFoundError(path);
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }

  const json = await res.json();
  return json.data as T;
}

/** Fresh fetch for build-time static params (avoids stale deleted slugs). */
async function rawGetFresh<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: 'no-store' });
  } catch {
    throw new Error('SERVER_UNREACHABLE');
  }

  if (res.status === 404) {
    throw new ApiNotFoundError(path);
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }

  const json = await res.json();
  return json.data as T;
}

async function rawGetOrNull<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  try {
    return await rawGet<T>(path, params);
  } catch (error) {
    if (error instanceof ApiNotFoundError) return null;
    throw error;
  }
}

function cached<T>(
  key: string,
  revalidate: number,
  loader: () => Promise<T>,
  tags: string[] = [],
): Promise<T> {
  return unstable_cache(loader, [key], { revalidate, tags })();
}

export const serverStore = {
  getProducts: (params?: Record<string, string>) => {
    const key = `products:${JSON.stringify(params ?? {})}`;
    return cached(key, 120, () => rawGet<Product[]>('/products', params), ['storefront-products']);
  },
  /** Live product list for generateStaticParams */
  getProductsFresh: (params?: Record<string, string>) =>
    rawGetFresh<Product[]>('/products', params),
  getProductBySlug: (slug: string) =>
    cached(
      `product-slug:${slug}`,
      120,
      () => rawGetOrNull<Product>(`/products/slug/${slug}/storefront`),
      ['storefront-products'],
    ),
  getCategories: () =>
    cached('categories', 120, () => rawGet<Category[]>('/categories'), ['storefront-categories']),
  getCategoriesFresh: () => rawGetFresh<Category[]>('/categories'),
  getCategoryBySlug: (slug: string) =>
    cached(
      `category-slug:${slug}`,
      120,
      () => rawGetOrNull<Category>(`/categories/slug/${slug}`),
      ['storefront-categories'],
    ),
  getCategoryPage: (slug: string) =>
    cached(
      `category-page:${slug}`,
      120,
      () =>
        rawGetOrNull<{ category: Category; categories: Category[]; products: Product[] }>(
          `/categories/slug/${slug}/storefront`,
        ),
      ['storefront-categories', 'storefront-products'],
    ),
  getSettings: () =>
    cached('settings-public', 15, () => rawGet<PublicSettings>('/settings/public'), [
      'storefront-settings',
    ]),
  getBanners: () =>
    cached('hero-banners', 30, () => rawGet<HeroBanner[]>('/hero-banners'), ['storefront-banners']),
  getHomepage: () =>
    cached(
      'storefront-homepage',
      30,
      () =>
        rawGet<{
          banners: HeroBanner[];
          categories: Category[];
          products: Product[];
          settings: PublicSettings;
          instagramReels: Array<{ id: string; videoUrl: string; sortOrder: number }>;
        }>('/storefront/homepage'),
      ['storefront-homepage', 'storefront-banners', 'storefront-categories', 'storefront-products', 'storefront-settings'],
    ),
  getCollectionsPage: () =>
    cached(
      'storefront-collections',
      120,
      () => rawGet<{ categories: Category[]; products: Product[] }>('/storefront/collections'),
      ['storefront-collections', 'storefront-categories', 'storefront-products'],
    ),
  getProductReviews: (productId: string) =>
    cached(`product-reviews:${productId}`, 120, () => rawGet<CustomerReview[]>(`/reviews/product/${productId}`), [
      'storefront-reviews',
    ]),
  getRelatedProducts: (productId: string, limit = 4) =>
    cached(
      `product-related:${productId}:${limit}`,
      120,
      () => rawGet<Product[]>(`/products/${productId}/related`, { limit: String(limit) }),
      ['storefront-products'],
    ),
};

/** Dedupe settings fetch within a single server request (layout + pages). */
export const getCachedSettings = cache(() => serverStore.getSettings());
