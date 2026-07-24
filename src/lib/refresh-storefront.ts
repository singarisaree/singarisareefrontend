import {
  revalidateStorefrontBanners,
  revalidateStorefrontCategories,
  revalidateStorefrontProduct,
  revalidateStorefrontReviews,
  revalidateStorefrontSettings,
} from '@/actions/revalidate-storefront';

export async function refreshStorefrontAfterProductChange(slug?: string) {
  try {
    await revalidateStorefrontProduct(slug);
  } catch {
    /* best-effort */
  }
}

export async function refreshStorefrontAfterCategoryChange(slug?: string) {
  try {
    await revalidateStorefrontCategories(slug);
  } catch {
    /* best-effort */
  }
}

export async function refreshStorefrontAfterSettingsChange() {
  try {
    await revalidateStorefrontSettings();
  } catch {
    /* best-effort */
  }
}

export async function refreshStorefrontAfterBannerChange() {
  try {
    await revalidateStorefrontBanners();
  } catch {
    /* best-effort */
  }
}

export async function refreshStorefrontAfterInstagramChange() {
  try {
    await revalidateStorefrontSettings();
  } catch {
    /* best-effort */
  }
}

export async function refreshStorefrontAfterReviewChange(productId?: string) {
  try {
    await revalidateStorefrontReviews(productId);
  } catch {
    /* best-effort */
  }
}
