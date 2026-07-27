'use client';

import { useEffect } from 'react';
import { resolveStorefrontImageUrl } from '@/lib/image';
import { preloadShowcaseVideos } from '@/lib/preload-showcase-videos';
import type { ShowcaseItem } from '@/types';

/** Warm showcase buffers as soon as homepage data is available. */
export function HomeShowcasePreload({ items }: { items: ShowcaseItem[] }) {
  useEffect(() => {
    const urls = items
      .filter((i) => i.videoUrl)
      .slice(0, 6)
      .map((i) => resolveStorefrontImageUrl(i.videoUrl));
    if (!urls.length) return;
    void preloadShowcaseVideos(urls);
  }, [items]);

  return null;
}
