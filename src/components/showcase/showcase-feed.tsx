'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveStorefrontImageUrl } from '@/lib/image';
import { preloadShowcaseVideosWithPriority } from '@/lib/preload-showcase-videos';
import { toast } from '@/lib/toast';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import type { ShowcaseItem } from '@/types';

type Props = {
  items: ShowcaseItem[];
  initialStartIndex?: number;
};

function ShowcaseSlide({
  item,
  videoSrc,
  posterSrc,
  isActive,
  muted,
  onToggleMute,
  onAutoplayBlocked,
}: {
  item: ShowcaseItem;
  videoSrc: string;
  posterSrc?: string;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onAutoplayBlocked: () => void;
}) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (isActive) {
      void el.play().catch(() => undefined);
    }
  }, [muted, isActive]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.muted = muted;
      if (!wasActiveRef.current) {
        el.currentTime = 0;
      }
      wasActiveRef.current = true;
      void el.play().catch(() => {
        if (!muted) onAutoplayBlocked();
      });
    } else {
      wasActiveRef.current = false;
      el.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muted handled in separate effect
  }, [isActive, videoSrc, onAutoplayBlocked]);

  const canPurchase = !item.isComingSoon && !item.isOutOfStock && item.maxStock > 0;

  const cartPayload = useMemo(
    () => ({
      productId: item.productId,
      productColorId: item.productColorId,
      productName: item.productName,
      colorName: item.colorName,
      slug: item.slug,
      imageUrl: item.imageUrl || '',
      price: item.price,
      mrp: item.mrp,
      maxStock: item.maxStock,
    }),
    [item],
  );

  const handleAddToCart = useCallback(() => {
    if (!canPurchase) {
      toast.error('This product is unavailable');
      return;
    }
    addItem({ ...cartPayload, quantity: 1 });
    toast.quick('Added to cart');
  }, [addItem, canPurchase, cartPayload]);

  const handleBuyNow = useCallback(() => {
    if (!canPurchase) {
      toast.error('This product is unavailable');
      return;
    }
    addItem({ ...cartPayload, quantity: 1 });
    router.push('/checkout');
  }, [addItem, canPurchase, cartPayload, router]);

  return (
    <section className="relative flex h-full w-full snap-start snap-always items-center justify-center overflow-hidden bg-black">
      <div className="relative h-full w-full md:max-w-[min(100%,calc(100dvh*9/16))]">
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          className="absolute inset-0 h-full w-full object-cover md:object-contain"
          playsInline
          loop
          preload="auto"
          muted={muted}
        />

        <Link
          href="/#showcase"
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm"
          aria-label="Back to Singari Showcase"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <button
          type="button"
          onClick={() => {
            const el = videoRef.current;
            if (el) {
              const nextMuted = !muted;
              el.muted = nextMuted;
              if (!nextMuted) void el.play().catch(() => undefined);
            }
            onToggleMute();
          }}
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
          aria-label={muted ? 'Unmute video' : 'Mute video'}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
          <p className="font-serif text-lg text-white">{item.productName}</p>
          <p className="mt-0.5 text-sm text-white/75">{item.colorName}</p>
          <p className="mt-2 text-base font-semibold text-white">{formatPrice(item.price)}</p>
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/40 bg-white/10 text-white hover:bg-white/20"
              disabled={!canPurchase}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to cart
            </Button>
            <Button
              type="button"
              variant="gold"
              className="flex-1"
              disabled={!canPurchase}
              onClick={handleBuyNow}
            >
              Buy now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowcaseFeedBody({ items, startIndex }: { items: ShowcaseItem[]; startIndex: number }) {
  const prepared = useMemo(
    () =>
      items.map((item) => ({
        item,
        videoSrc: resolveStorefrontImageUrl(item.videoUrl),
        posterSrc: item.imageUrl ? resolveStorefrontImageUrl(item.imageUrl) : undefined,
      })),
    [items],
  );

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [muted, setMuted] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didScrollRef = useRef(false);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const handleAutoplayBlocked = useCallback(() => {
    setMuted(true);
  }, []);

  useEffect(() => {
    if (!prepared.length) return;
    const urls = prepared.map((p) => p.videoSrc);
    void preloadShowcaseVideosWithPriority(urls, startIndex);
  }, [prepared, startIndex]);

  useEffect(() => {
    setActiveIndex(startIndex);
    didScrollRef.current = false;
  }, [startIndex]);

  useEffect(() => {
    if (!scrollerRef.current || didScrollRef.current) return;
    const el = scrollerRef.current.children[startIndex] as HTMLElement | undefined;
    if (!el) return;
    el.scrollIntoView({ behavior: 'auto' });
    didScrollRef.current = true;
  }, [startIndex, prepared.length]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isFinite(idx)) setActiveIndex(idx);
        }
      },
      { root, threshold: [0.6] },
    );

    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [prepared.length]);

  if (!prepared.length) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-brown-light">No showcase videos yet.</p>
        <Link href="/#showcase" className="text-sm font-medium text-maroon">
          Back to Singari Showcase
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-black"
    >
      {prepared.map(({ item, videoSrc, posterSrc }, index) => (
        <div key={item.id} data-index={index} className="h-dvh w-full shrink-0">
          <ShowcaseSlide
            item={item}
            videoSrc={videoSrc}
            posterSrc={posterSrc}
            isActive={activeIndex === index}
            muted={muted}
            onToggleMute={toggleMute}
            onAutoplayBlocked={handleAutoplayBlocked}
          />
        </div>
      ))}
    </div>
  );
}

function ShowcaseFeedContent({ items, initialStartIndex = 0 }: Props) {
  const searchParams = useSearchParams();
  const startRaw = Number(searchParams.get('start') ?? String(initialStartIndex));
  const startIndex = Number.isFinite(startRaw)
    ? Math.max(0, Math.min(items.length - 1, startRaw))
    : initialStartIndex;

  return <ShowcaseFeedBody items={items} startIndex={startIndex} />;
}

export function ShowcaseFeed(props: Props) {
  const fallbackStart = props.initialStartIndex ?? 0;
  return (
    <Suspense fallback={<ShowcaseFeedBody items={props.items} startIndex={fallbackStart} />}>
      <ShowcaseFeedContent {...props} />
    </Suspense>
  );
}
