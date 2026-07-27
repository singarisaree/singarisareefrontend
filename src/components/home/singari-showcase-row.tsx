'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveStorefrontImageUrl } from '@/lib/image';
import { preloadShowcaseVideos } from '@/lib/preload-showcase-videos';
import { toast } from '@/lib/toast';
import { useCartStore } from '@/stores/cart-store';
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
  const addItem = useCartStore((s) => s.addItem);

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

  const canPurchase = !item.isComingSoon && !item.isOutOfStock && item.maxStock > 0;

  const handleBuyNow = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canPurchase) {
        toast.error('This product is unavailable');
        return;
      }
      addItem({
        productId: item.productId,
        productColorId: item.productColorId,
        productName: item.productName,
        colorName: item.colorName,
        slug: item.slug,
        imageUrl: item.imageUrl || '',
        price: item.price,
        mrp: item.mrp,
        maxStock: item.maxStock,
        quantity: 1,
      });
      router.push('/checkout');
    },
    [addItem, canPurchase, item, router],
  );

  return (
    <div className="relative aspect-[9/16] w-[42vw] max-w-[11rem] shrink-0 snap-start overflow-hidden rounded-xl bg-charcoal sm:w-44 lg:w-48">
      <Link
        href={`/showcase?start=${index}`}
        className="absolute inset-0"
        aria-label={`Watch ${item.productName}`}
      >
        <video
          ref={ref}
          src={videoSrc}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
        />
      </Link>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2 pt-10">
        <p className="pointer-events-none w-full line-clamp-2 text-[10px] font-medium leading-snug text-white sm:text-xs">
          {item.productName}
        </p>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!canPurchase}
          className="pointer-events-auto mt-1 w-[66%] rounded-full bg-cream/95 px-1 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-maroon shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-[8px]"
        >
          Buy now
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

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!prepared.length) return;
    let cancelled = false;
    setReady(false);
    void preloadShowcaseVideos(prepared.map((p) => p.videoSrc)).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [prepared]);

  if (!prepared.length) return null;
  if (!ready) return null;

  return (
    <div className="flex w-max gap-3 sm:gap-4">
      {prepared.map(({ item, videoSrc }, index) => (
        <ShowcaseTile key={item.id} item={item} videoSrc={videoSrc} index={index} />
      ))}
    </div>
  );
}
