'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

function revalidateCorePaths() {
  revalidatePath('/');
  revalidatePath('/collections');
  revalidatePath('/category', 'layout');
  revalidatePath('/search');
}

/** Called from realtime socket on open storefront tabs when admin changes catalog/content. */
export async function refreshStorefrontCacheFromRealtime() {
  revalidateTag('storefront-products');
  revalidateTag('storefront-categories');
  revalidateTag('storefront-settings');
  revalidateTag('storefront-banners');
  revalidateTag('storefront-homepage');
  revalidateTag('storefront-collections');
  revalidateTag('storefront-reviews');
  revalidateCorePaths();
}

/** Bust storefront caches after admin product changes */
export async function revalidateStorefrontProduct(slug?: string) {
  revalidateTag('storefront-products');
  revalidateTag('storefront-homepage');
  revalidateTag('storefront-collections');
  if (slug) {
    revalidatePath(`/product/${slug}`);
  }
  revalidateCorePaths();
}

export async function revalidateStorefrontCategories(slug?: string) {
  revalidateTag('storefront-categories');
  revalidateTag('storefront-homepage');
  revalidateTag('storefront-collections');
  if (slug) {
    revalidatePath(`/category/${slug}`);
  }
  revalidateCorePaths();
}

export async function revalidateStorefrontSettings() {
  revalidateTag('storefront-settings');
  revalidateTag('storefront-homepage');
  revalidateCorePaths();
}

export async function revalidateStorefrontBanners() {
  revalidateTag('storefront-banners');
  revalidateTag('storefront-homepage');
  revalidatePath('/');
}

export async function revalidateStorefrontReviews(productId?: string) {
  revalidateTag('storefront-reviews');
  revalidateTag('storefront-products');
  if (productId) {
    revalidateTag(`storefront-reviews:${productId}`);
  }
}
