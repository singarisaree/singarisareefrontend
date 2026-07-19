'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PREFETCH_LIMIT = 24;
const IMMEDIATE_PREFETCH_COUNT = 8;

interface ProductRoutesPrefetchProps {
  slugs: string[];
}

/** Prefetch only the first few visible product routes on listing pages. */
export function ProductRoutesPrefetch({ slugs }: ProductRoutesPrefetchProps) {
  const router = useRouter();

  useEffect(() => {
    const unique = [...new Set(slugs.filter(Boolean))].slice(0, PREFETCH_LIMIT);
    const immediate = unique.slice(0, IMMEDIATE_PREFETCH_COUNT);
    const deferred = unique.slice(IMMEDIATE_PREFETCH_COUNT);

    immediate.forEach((slug) => router.prefetch(`/product/${slug}`));

    const warm = () => {
      deferred.forEach((slug) => router.prefetch(`/product/${slug}`));
    };

    const requestIdle = (
      window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      }
    ).requestIdleCallback;
    if (requestIdle) {
      requestIdle(warm, { timeout: 1500 });
    } else {
      globalThis.setTimeout(warm, 150);
    }
  }, [slugs, router]);

  return null;
}
