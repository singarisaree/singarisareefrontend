'use client';

import { memo, useMemo, type CSSProperties } from 'react';
import { openInstagramMediaInApp, parseInstagramMedia } from '@/lib/open-instagram';

export type InstagramReelUrl = string;

type InstagramReelsSliderProps = {
  urls: InstagramReelUrl[];
  className?: string;
};

function parseInstagramPaths(url: string): { embedSrc: string; permalink: string } | null {
  const media = parseInstagramMedia(url);
  if (!media) return null;
  return {
    permalink: media.webUrl,
    embedSrc: `${media.webUrl}embed/?autoplay=1`,
  };
}

const ReelCard = memo(function ReelCard({
  embedSrc,
  permalink,
}: {
  embedSrc: string;
  permalink: string;
}) {
  return (
    <article
      className="relative aspect-[9/16] w-[calc(50%-0.5rem)] shrink-0 snap-start overflow-hidden rounded-xl bg-[#fafafa] sm:w-[calc(50%-0.75rem)]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '280px 500px' } as CSSProperties}
    >
      <iframe
        src={embedSrc}
        title="Instagram video"
        loading="lazy"
        allow="autoplay; encrypted-media; clipboard-write; fullscreen"
        allowFullScreen
        scrolling="no"
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
      />
      <button
        type="button"
        onClick={() => openInstagramMediaInApp(permalink)}
        aria-label="Open this Instagram video in the Instagram app"
        className="absolute inset-0 z-10 cursor-pointer"
      />
    </article>
  );
});

function InstagramReelsSliderInner({ urls, className }: InstagramReelsSliderProps) {
  const items = useMemo(() => {
    const seen = new Set<string>();
    const next: Array<{ embedSrc: string; permalink: string }> = [];
    for (const url of urls) {
      const parsed = parseInstagramPaths(url);
      if (!parsed || seen.has(parsed.permalink)) continue;
      seen.add(parsed.permalink);
      next.push(parsed);
      if (next.length >= 10) break;
    }
    return next;
  }, [urls]);

  if (!items.length) return null;

  return (
    <div className={className}>
      <div
        className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
        style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
      >
        {items.map((item) => (
          <ReelCard key={item.permalink} embedSrc={item.embedSrc} permalink={item.permalink} />
        ))}
      </div>
    </div>
  );
}

export const InstagramReelsSlider = memo(InstagramReelsSliderInner);
InstagramReelsSlider.displayName = 'InstagramReelsSlider';
