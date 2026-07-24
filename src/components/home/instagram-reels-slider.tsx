'use client';

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { InstagramAppLink } from '@/components/instagram-app-link';
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

const FIRST_BATCH = 5;
const PRELOAD_TIMEOUT_MS = 12_000;

/** Warm the browser cache for a video URL (first 5, then next 5). */
function preloadVideoSrc(src: string): Promise<void> {
  if (typeof window === 'undefined' || !src) return Promise.resolve();

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        // ignore
      }
      resolve();
    };

    const timer = window.setTimeout(finish, PRELOAD_TIMEOUT_MS);
    video.addEventListener('canplaythrough', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    video.src = src;
    video.load();
  });
}

const ReelCard = memo(function ReelCard({
  videoSrc,
  instagramUrl,
  canLoad,
}: {
  videoSrc: string;
  instagramUrl: string;
  canLoad: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
  }, [videoSrc, canLoad]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !canLoad) return;

    const markReady = () => setIsReady(true);
    if (el.readyState >= 3) markReady();
    el.addEventListener('canplay', markReady);
    el.addEventListener('loadeddata', markReady);

    return () => {
      el.removeEventListener('canplay', markReady);
      el.removeEventListener('loadeddata', markReady);
    };
  }, [canLoad, videoSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !canLoad) return;

    const tryPlay = () => {
      if (!isReady) return;
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
  }, [canLoad, isReady, videoSrc]);

  return (
    <article
      className="relative aspect-[9/16] w-[calc((100%-0.75rem)/2)] shrink-0 snap-start overflow-hidden rounded-lg bg-[#0f0f0f] lg:w-[calc((100%-3rem)/5)]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '160px 280px' } as CSSProperties}
    >
      {canLoad ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isReady ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
        />
      ) : null}
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
        .slice(0, 10)
        .map((reel) => ({
          id: reel.id,
          videoSrc: resolveStorefrontImageUrl(reel.videoUrl),
          instagramUrl: reel.instagramUrl,
        })),
    [reels],
  );

  // 1 = first 5 loading/shown, 2 = next 5 unlocked after first batch is warm
  const [loadBatch, setLoadBatch] = useState(1);

  useEffect(() => {
    if (!items.length) return;

    let cancelled = false;
    setLoadBatch(1);

    void (async () => {
      const urls = items.map((item) => item.videoSrc);
      const first = urls.slice(0, FIRST_BATCH);
      const second = urls.slice(FIRST_BATCH);

      // Warm cache for first 5, then unlock + warm next 5
      await Promise.all(first.map((src) => preloadVideoSrc(src)));
      if (cancelled) return;

      if (second.length) {
        setLoadBatch(2);
        await Promise.all(second.map((src) => preloadVideoSrc(src)));
      } else {
        setLoadBatch(2);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (!items.length) return null;

  return (
    <div className={className}>
      <div
        className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
        style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
      >
        {items.map((item, index) => (
          <ReelCard
            key={item.id}
            videoSrc={item.videoSrc}
            instagramUrl={item.instagramUrl}
            canLoad={index < FIRST_BATCH || loadBatch >= 2}
          />
        ))}
      </div>
    </div>
  );
}

export const InstagramReelsSlider = memo(InstagramReelsSliderInner);
InstagramReelsSlider.displayName = 'InstagramReelsSlider';
