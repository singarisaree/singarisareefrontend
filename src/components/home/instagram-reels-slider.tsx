'use client';

import { memo, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { openInstagramMediaInApp } from '@/lib/open-instagram';
import { resolveStorefrontImageUrl } from '@/lib/image';

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
    return () => observer.disconnect();
  }, [videoSrc]);

  return (
    <article
      className="relative aspect-[9/16] w-[calc((100%-0.75rem)/2)] shrink-0 snap-start overflow-hidden rounded-lg bg-[#0f0f0f] lg:w-[calc((100%-3rem)/5)]"
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
        preload="metadata"
      />
      <button
        type="button"
        onClick={() => openInstagramMediaInApp(instagramUrl)}
        aria-label="Open this Instagram video"
        className="absolute inset-0 z-10 cursor-pointer"
      />
    </article>
  );
});

function InstagramReelsSliderInner({ reels, className }: InstagramReelsSliderProps) {
  const items = useMemo(
    () =>
      reels
        .filter((reel) => reel.videoUrl && reel.instagramUrl)
        .slice(0, 10)
        .map((reel) => ({
          id: reel.id,
          videoSrc: resolveStorefrontImageUrl(reel.videoUrl),
          instagramUrl: reel.instagramUrl,
        })),
    [reels],
  );

  if (!items.length) return null;

  return (
    <div className={className}>
      <div
        className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
        style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
      >
        {items.map((item) => (
          <ReelCard key={item.id} videoSrc={item.videoSrc} instagramUrl={item.instagramUrl} />
        ))}
      </div>
    </div>
  );
}

export const InstagramReelsSlider = memo(InstagramReelsSliderInner);
InstagramReelsSlider.displayName = 'InstagramReelsSlider';
