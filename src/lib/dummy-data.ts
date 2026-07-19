/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DUMMY STOREFRONT DATA (temporary preview content)
 * ─────────────────────────────────────────────────────────────────────────────
 * Used ONLY as a fallback when the backend API is unreachable, so the storefront
 * (home, collections, category, product pages) shows sample sarees without a
 * running backend.
 *
 * TO REMOVE LATER: delete this file and remove the `withDummyFallback(...)`
 * wrappers in `src/lib/server-store.ts`. Nothing else depends on this module.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Category, HeroBanner, Product, PublicSettings } from '@/types';

/** Deterministic placeholder image (Picsum). Allowed in next.config remotePatterns. */
function img(seed: string): string {
  return `https://picsum.photos/seed/${seed}/800/1000`;
}

export const dummyCategories: Category[] = [
  { id: 'dummy-cat-1', name: 'Silk Sarees', slug: 'silk-sarees', imageUrl: img('silk-cat'), sortOrder: 0, isActive: true, _count: { products: 2 } },
  { id: 'dummy-cat-2', name: 'Cotton Sarees', slug: 'cotton-sarees', imageUrl: img('cotton-cat'), sortOrder: 1, isActive: true, _count: { products: 2 } },
  { id: 'dummy-cat-3', name: 'Banarasi Sarees', slug: 'banarasi-sarees', imageUrl: img('banarasi-cat'), sortOrder: 2, isActive: true, _count: { products: 2 } },
  { id: 'dummy-cat-4', name: 'Designer Sarees', slug: 'designer-sarees', imageUrl: img('designer-cat'), sortOrder: 3, isActive: true, _count: { products: 2 } },
];

function makeProduct(params: {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  price: number;
  mrp: number;
  seed: string;
  fabric?: string;
  featured?: boolean;
}): Product {
  const fabric = params.fabric ?? 'Silk';
  const discount = Math.max(0, Math.round(((params.mrp - params.price) / params.mrp) * 100));
  const primary = img(params.seed);
  const secondary = img(`${params.seed}-b`);
  return {
    id: params.id,
    name: params.name,
    slug: params.slug,
    sku: params.id.toUpperCase(),
    categoryId: params.categoryId,
    category: { id: params.categoryId, name: params.categoryName, slug: params.categorySlug },
    description:
      'A beautiful handcrafted saree — this is sample preview content shown while the store catalogue is being set up.',
    fabric,
    care: 'Dry clean only.',
    shippingInfo: 'Ships in 3–7 days across India.',
    returnPolicy: '7-day easy returns.',
    price: params.price,
    mrp: params.mrp,
    discount,
    effectivePrice: params.price,
    weight: 800,
    tags: ['sample', fabric.toLowerCase()],
    soldCount: 40,
    baseSoldCount: 120,
    displaySoldCount: 160,
    isActive: true,
    isFeatured: params.featured ?? false,
    defaultImage: primary,
    totalStock: 25,
    isOutOfStock: false,
    colors: [
      {
        id: `${params.id}-color-1`,
        name: 'Default',
        hexCode: '#7b1e3b',
        sortOrder: 0,
        isActive: true,
        availableStock: 25,
        quantity: 25,
        reserved: 0,
        images: [
          { id: `${params.id}-img-1`, url: primary, highResUrl: primary, sortOrder: 0, isDefault: true },
          { id: `${params.id}-img-2`, url: secondary, highResUrl: secondary, sortOrder: 1, isDefault: false },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
  };
}

export const dummyProducts: Product[] = [
  makeProduct({ id: 'dummy-p1', name: 'Kanchipuram Silk Saree', slug: 'kanchipuram-silk-saree', categoryId: 'dummy-cat-1', categoryName: 'Silk Sarees', categorySlug: 'silk-sarees', price: 4999, mrp: 7999, seed: 'saree1', fabric: 'Silk', featured: true }),
  makeProduct({ id: 'dummy-p2', name: 'Mysore Pure Silk Saree', slug: 'mysore-pure-silk-saree', categoryId: 'dummy-cat-1', categoryName: 'Silk Sarees', categorySlug: 'silk-sarees', price: 3799, mrp: 5999, seed: 'saree2' }),
  makeProduct({ id: 'dummy-p3', name: 'Handloom Cotton Saree', slug: 'handloom-cotton-saree', categoryId: 'dummy-cat-2', categoryName: 'Cotton Sarees', categorySlug: 'cotton-sarees', price: 1499, mrp: 2499, seed: 'saree3', fabric: 'Cotton', featured: true }),
  makeProduct({ id: 'dummy-p4', name: 'Jamdani Cotton Saree', slug: 'jamdani-cotton-saree', categoryId: 'dummy-cat-2', categoryName: 'Cotton Sarees', categorySlug: 'cotton-sarees', price: 1899, mrp: 2999, seed: 'saree4', fabric: 'Cotton' }),
  makeProduct({ id: 'dummy-p5', name: 'Banarasi Silk Saree', slug: 'banarasi-silk-saree', categoryId: 'dummy-cat-3', categoryName: 'Banarasi Sarees', categorySlug: 'banarasi-sarees', price: 5499, mrp: 8999, seed: 'saree5', fabric: 'Silk', featured: true }),
  makeProduct({ id: 'dummy-p6', name: 'Katan Banarasi Saree', slug: 'katan-banarasi-saree', categoryId: 'dummy-cat-3', categoryName: 'Banarasi Sarees', categorySlug: 'banarasi-sarees', price: 6299, mrp: 9999, seed: 'saree6', fabric: 'Silk' }),
  makeProduct({ id: 'dummy-p7', name: 'Designer Georgette Saree', slug: 'designer-georgette-saree', categoryId: 'dummy-cat-4', categoryName: 'Designer Sarees', categorySlug: 'designer-sarees', price: 2799, mrp: 4499, seed: 'saree7', fabric: 'Georgette', featured: true }),
  makeProduct({ id: 'dummy-p8', name: 'Embroidered Party Saree', slug: 'embroidered-party-saree', categoryId: 'dummy-cat-4', categoryName: 'Designer Sarees', categorySlug: 'designer-sarees', price: 3299, mrp: 5299, seed: 'saree8', fabric: 'Net' }),
];

export const dummyBanners: HeroBanner[] = [
  { id: 'dummy-banner-1', title: 'The Festive Edit', subtitle: 'Handpicked silks for every celebration', imageUrl: img('hero1'), linkUrl: '/collections', sortOrder: 0, isActive: true },
  { id: 'dummy-banner-2', title: 'Everyday Elegance', subtitle: 'Soft cottons, effortless drape', imageUrl: img('hero2'), linkUrl: '/collections', sortOrder: 1, isActive: true },
];

export const dummySettings: PublicSettings = {
  store_name: 'Singari Sarees',
  store_tagline: 'Timeless sarees for every occasion',
  free_shipping_threshold: 1999,
  free_shipping_enabled: false,
  announcement_bar_enabled: true,
  announcement_bar_text: 'FREE SHIPPING on Orders Above Rs. 1999',
  estimated_delivery_days: 7,
};

export function dummyHomepage() {
  return {
    banners: dummyBanners,
    categories: dummyCategories,
    products: dummyProducts,
    settings: dummySettings,
  };
}

export function dummyCollectionsPage() {
  return { categories: dummyCategories, products: dummyProducts };
}

export function dummyCategoryPage(slug: string) {
  const category = dummyCategories.find((c) => c.slug === slug) ?? dummyCategories[0];
  return {
    category,
    categories: dummyCategories,
    products: dummyProducts.filter((p) => p.category?.slug === category.slug),
  };
}

export function dummyProductBySlug(slug: string): Product | null {
  return dummyProducts.find((p) => p.slug === slug) ?? null;
}

export function dummyRelated(productId: string, limit = 4): Product[] {
  return dummyProducts.filter((p) => p.id !== productId).slice(0, limit);
}
