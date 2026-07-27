'use client';

import { useEffect } from 'react';
import { resolveStorefrontImageUrl } from '@/lib/image';
import {
  MAX_REELS,
  preloadInstagramReelsFirstBatch,
  preloadInstagramReelsSecondBatch,
} from '@/lib/preload-instagram-reels';

type Reel = { videoUrl: string };

/** Warm Instagram reel buffers as soon as homepage data is available. */
export function HomeInstagramPreload({ reels }: { reels: Reel[] }) {
  useEffect(() => {
    const urls = reels
      .filter((r) => r.videoUrl)
      .slice(0, MAX_REELS)
      .map((r) => resolveStorefrontImageUrl(r.videoUrl));
    if (!urls.length) return;
    void preloadInstagramReelsFirstBatch(urls).then(() => {
      void preloadInstagramReelsSecondBatch(urls);
    });
  }, [reels]);

  return null;
}
