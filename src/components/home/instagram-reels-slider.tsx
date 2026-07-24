'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';

export type InstagramReelUrl = string;

type InstagramReelsSliderProps = {
  urls: InstagramReelUrl[];
  className?: string;
};

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

const EMBED_SCRIPT_SRC = 'https://www.instagram.com/embed.js';
let embedScriptPromise: Promise<void> | null = null;

function loadInstagramEmbedScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.instgrm?.Embeds?.process) return Promise.resolve();
  if (embedScriptPromise) return embedScriptPromise;

  embedScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-instagram-embed]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Instagram embed failed')), {
        once: true,
      });
      if (window.instgrm?.Embeds?.process) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = EMBED_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.instagramEmbed = 'true';
    script.onload = () => resolve();
    script.onerror = () => {
      embedScriptPromise = null;
      reject(new Error('Instagram embed failed'));
    };
    document.body.appendChild(script);
  });

  return embedScriptPromise;
}

function toPermalink(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const path = parsed.pathname.replace(/\/+$/, '') + '/';
    return `https://www.instagram.com${path}`;
  } catch {
    return url;
  }
}

const ReelCard = memo(function ReelCard({ permalink }: { permalink: string }) {
  return (
    <article
      className="relative w-[min(78vw,19rem)] shrink-0 snap-start sm:w-[20rem]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '480px 640px' } as CSSProperties}
    >
      <blockquote
        className="instagram-media !m-0 !min-w-0 !max-w-none !w-full"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
        style={{
          background: '#FFF',
          border: 0,
          borderRadius: '3px',
          boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
          margin: 0,
          maxWidth: '100%',
          minWidth: 0,
          padding: 0,
          width: '100%',
        }}
      >
        <a href={permalink} target="_blank" rel="noopener noreferrer">
          View on Instagram
        </a>
      </blockquote>
      {/*
        Click anywhere on the reel opens Instagram. Embed still loads/plays underneath
        when the section enters the viewport (script processed on intersect).
      */}
      <a
        href={permalink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open Instagram video"
        className="absolute inset-0 z-10"
      />
    </article>
  );
});

function InstagramReelsSliderInner({ urls, className }: InstagramReelsSliderProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasProcessed = useRef(false);
  const permalinks = useMemo(
    () =>
      urls
        .map((url) => toPermalink(url))
        .filter((url, index, list) => url && list.indexOf(url) === index)
        .slice(0, 10),
    [urls],
  );
  const permalinkKey = permalinks.join('|');

  const processEmbeds = useCallback(async () => {
    if (!permalinks.length) return;
    try {
      await loadInstagramEmbedScript();
      window.instgrm?.Embeds?.process();
      hasProcessed.current = true;
    } catch {
      // Embed script optional — slider still shows fallback links.
    }
  }, [permalinks]);

  useEffect(() => {
    hasProcessed.current = false;
  }, [permalinkKey]);

  useEffect(() => {
    if (!permalinks.length) return;
    const root = sectionRef.current;
    if (!root) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (cancelled || hasProcessed.current) return;
        void processEmbeds();
        observer.disconnect();
      },
      { root: null, rootMargin: '180px 0px', threshold: 0.01 },
    );

    observer.observe(root);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [permalinkKey, permalinks.length, processEmbeds]);

  if (!permalinks.length) return null;

  return (
    <div ref={sectionRef} className={className}>
      <div
        className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
        style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
      >
        {permalinks.map((permalink) => (
          <ReelCard key={permalink} permalink={permalink} />
        ))}
      </div>
    </div>
  );
}

export const InstagramReelsSlider = memo(InstagramReelsSliderInner);
InstagramReelsSlider.displayName = 'InstagramReelsSlider';
