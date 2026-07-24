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
const PRELOAD_TIMEOUT_MS = 15_000;

/**
 * Preload videos into memory and keep elements alive so the cache is warm.
 * Does not clear src (clearing was dropping the buffer and showing dark cards).
 */
function preloadVideos(urls: string[]): Promise<HTMLVideoElement[]> {
  if (typeof window === 'undefined' || !urls.length) return Promise.resolve([]);

  return Promise.all(
    urls.map(
      (src) =>
        new Promise<HTMLVideoElement>((resolve) => {
          const video = document.createElement('video');
          video.muted = true;
          video.playsInline = true;
          video.preload = 'auto';
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');

          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(video);
          };

          const timer = window.setTimeout(finish, PRELOAD_TIMEOUT_MS);
          video.addEventListener('canplaythrough', finish, { once: true });
          video.addEventListener('error', finish, { once: true });
          video.src = src;
          video.load();
        }),
    ),
  );
}

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
      className="relative aspect-[9/16] w-[calc((100%-0.75rem)/2)] shrink-0 snap-start overflow-hidden rounded-lg bg-transparent lg:w-[calc((100%-3rem)/5)]"
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
        .slice(0, 10)
        .map((reel) => ({
          id: reel.id,
          videoSrc: resolveStorefrontImageUrl(reel.videoUrl),
          instagramUrl: reel.instagramUrl,
        })),
    [reels],
  );

  // Hold preloaded <video> nodes so buffers stay warm
  const holdersRef = useRef<HTMLVideoElement[]>([]);
  const [firstReady, setFirstReady] = useState(false);
  const [secondReady, setSecondReady] = useState(false);

  useEffect(() => {
    if (!items.length) return;

    let cancelled = false;
    setFirstReady(false);
    setSecondReady(false);

    // Release previous holders
    holdersRef.current.forEach((video) => {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        // ignore
      }
    });
    holdersRef.current = [];

    void (async () => {
      const firstUrls = items.slice(0, FIRST_BATCH).map((item) => item.videoSrc);
      const secondUrls = items.slice(FIRST_BATCH).map((item) => item.videoSrc);

      // Load first 5 as soon as user lands on homepage — only then show the row
      const firstHolders = await preloadVideos(firstUrls);
      if (cancelled) {
        firstHolders.forEach((v) => {
          v.removeAttribute('src');
          v.load();
        });
        return;
      }
      holdersRef.current.push(...firstHolders);
      setFirstReady(true);

      if (!secondUrls.length) {
        setSecondReady(true);
        return;
      }

      // Then warm next 5 in the background
      const secondHolders = await preloadVideos(secondUrls);
      if (cancelled) {
        secondHolders.forEach((v) => {
          v.removeAttribute('src');
          v.load();
        });
        return;
      }
      holdersRef.current.push(...secondHolders);
      setSecondReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    return () => {
      holdersRef.current.forEach((video) => {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // ignore
        }
      });
      holdersRef.current = [];
    };
  }, []);

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
