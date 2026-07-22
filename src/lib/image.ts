import { API_ORIGIN } from '@/lib/api-origin';

/** Blob/data URLs cannot be processed by the Next.js image optimizer. */
export function isLocalImagePreview(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:');
}

/** Relative /uploads paths from the API → absolute URL for Next.js Image + SSR. */
export function resolveStorefrontImageUrl(src?: string | null): string {
  const trimmed = src?.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_ORIGIN}${path}`;
}

/** Prefer same-origin `/uploads/...` for LCP hero images (Next rewrite proxies to API). */
export function resolveHeroImageUrl(src?: string | null): string {
  const resolved = resolveStorefrontImageUrl(src);
  if (!resolved) return '';
  if (resolved.startsWith('/uploads/')) return resolved;
  try {
    const url = new URL(resolved);
    if (url.pathname.startsWith('/uploads/')) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    // keep absolute URL (e.g. Cloudinary)
  }
  return resolved;
}

/** Uploaded WebP/JPEG assets are already optimized on the backend. */
export function shouldUnoptimizeStorefrontImage(src: string): boolean {
  if (!src) return false;
  if (isLocalImagePreview(src)) return true;
  return src.startsWith('/uploads/') || src.includes('/uploads/') || /\.webp(?:$|\?)/i.test(src);
}
