'use client';

import Link from 'next/link';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { resolveStorefrontImageUrl } from '@/lib/image';
import { preloadShowcaseVideo, preloadShowcaseVideos } from '@/lib/preload-showcase-videos';
import type { ShowcaseItem } from '@/types';

type Props = {
  items: ShowcaseItem[];
};

const ShowcaseTile = memo(function ShowcaseTile({
  item,
  videoSrc,
  index,
}: {
  item: ShowcaseItem;
  videoSrc: string;
  index: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const play = () => void el.play().catch(() => undefined);
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) play();
        else el.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    play();
    return () => observer.disconnect();
  }, [videoSrc]);

  return (
    <div className="relative aspect-[9/16] w-[42vw] max-w-[11rem] shrink-0 snap-start overflow-hidden rounded-xl bg-charcoal sm:w-44 lg:w-48">
      <Link
        href={`/showcase?start=${index}`}
        prefetch
        className="absolute inset-0"
        aria-label={`Watch ${item.productName}`}
        onMouseEnter={() => {
          router.prefetch(`/showcase?start=${index}`);
          void preloadShowcaseVideo(videoSrc);
        }}
        onFocus={() => {
          router.prefetch(`/showcase?start=${index}`);
          void preloadShowcaseVideo(videoSrc);
        }}
      >
        <video
          ref={ref}
          src={videoSrc}
          poster={item.imageUrl ? resolveStorefrontImageUrl(item.imageUrl) : undefined}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
        />
      </Link>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center bg-gradient-to-t from-black/60 to-transparent px-2 pb-3 pt-12">
        <button
          type="button"
          className="pointer-events-none rounded-full bg-cream/95 px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-maroon shadow-sm transition group-hover:bg-white sm:text-[10px]"
        >
          View
        </button>
      </div>
    </div>
  );
});

export function SingariShowcaseRow({ items }: Props) {
  const prepared = useMemo(
    () =>
      items
        .filter((i) => i.videoUrl && i.isActive)
        .slice(0, 6)
        .map((item) => ({
          item,
          videoSrc: resolveStorefrontImageUrl(item.videoUrl),
        })),
    [items],
  );

  useEffect(() => {
    if (!prepared.length) return;
    void preloadShowcaseVideos(prepared.map((p) => p.videoSrc));
  }, [prepared]);

  if (!prepared.length) return null;

  return (
    <div className="flex w-max gap-3 sm:gap-4">
      {prepared.map(({ item, videoSrc }, index) => (
        <ShowcaseTile key={item.id} item={item} videoSrc={videoSrc} index={index} />
      ))}
    </div>
  );
}
