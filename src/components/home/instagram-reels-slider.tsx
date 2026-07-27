'use client';

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { InstagramAppLink } from '@/components/instagram-app-link';
import { resolveStorefrontImageUrl } from '@/lib/image';
import {
  FIRST_BATCH,
  MAX_REELS,
  preloadInstagramReelsFirstBatch,
  preloadInstagramReelsSecondBatch,
} from '@/lib/preload-instagram-reels';

export type InstagramReelItem = {
  id: string;
  videoUrl: string;
  instagramUrl: string;
};

type InstagramReelsSliderProps = {
  reels: InstagramReelItem[];
  className?: string;
};

const ReelCard = memo(function ReelCard({
  videoSrc,
  instagramUrl,
}: {
  videoSrc: string;
  instagramUrl: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const tryPlay = () => {
      void el.play().catch(() => undefined);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) tryPlay();
        else el.pause();
      },
      { threshold: 0.35 },
    );

    observer.observe(el);
    tryPlay();
    return () => observer.disconnect();
  }, [videoSrc]);

  return (
    <article
      className="relative aspect-[9/16] w-[calc((100%-0.75rem)*0.4)] shrink-0 snap-start overflow-hidden rounded-lg bg-transparent lg:w-[calc((100%-3rem)/5)]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '160px 280px' } as CSSProperties}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        loop
        autoPlay
        preload="auto"
      />
      <InstagramAppLink
        instagramUrl={instagramUrl}
        aria-label="Open this Instagram video"
        className="absolute inset-0 z-10"
      />
    </article>
  );
});

function InstagramReelsSliderInner({ reels, className }: InstagramReelsSliderProps) {
  const items = useMemo(
    () =>
      reels
        .filter((reel) => reel.videoUrl && reel.instagramUrl)
        .slice(0, MAX_REELS)
        .map((reel) => ({
          id: reel.id,
          videoSrc: resolveStorefrontImageUrl(reel.videoUrl),
          instagramUrl: reel.instagramUrl,
        })),
    [reels],
  );

  const [firstReady, setFirstReady] = useState(false);
  const [secondReady, setSecondReady] = useState(false);

  useEffect(() => {
    if (!items.length) return;

    let cancelled = false;
    setFirstReady(false);
    setSecondReady(false);

    const urls = items.map((item) => item.videoSrc);

    void preloadInstagramReelsFirstBatch(urls).then(() => {
      if (cancelled) return;
      setFirstReady(true);
      return preloadInstagramReelsSecondBatch(urls);
    }).then(() => {
      if (!cancelled) setSecondReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (!items.length) return null;

  // No dark cards / spinner — hide section until first 5 are ready to play
  if (!firstReady) return null;

  const visibleItems = secondReady ? items : items.slice(0, FIRST_BATCH);

  return (
    <div className={className}>
      <div
        className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
        style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
      >
        {visibleItems.map((item) => (
          <ReelCard key={item.id} videoSrc={item.videoSrc} instagramUrl={item.instagramUrl} />
        ))}
      </div>
    </div>
  );
}

export const InstagramReelsSlider = memo(InstagramReelsSliderInner);
InstagramReelsSlider.displayName = 'InstagramReelsSlider';
