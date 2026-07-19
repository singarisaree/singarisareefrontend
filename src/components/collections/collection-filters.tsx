'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

interface CollectionFiltersProps {
  categories: Category[];
  activeSlug?: string;
}

export function CollectionFilters({ categories, activeSlug }: CollectionFiltersProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeSlug]);

  const prefetchCategory = (slug: string) => {
    router.prefetch(`/category/${slug}`);
  };

  return (
    <div className="sticky top-[4.5rem] z-20 -mx-4 mb-8 border-y border-black/[0.04] bg-cream/95 backdrop-blur-md sm:top-20 sm:-mx-6 lg:-mx-10">
      <div className="relative mx-auto max-w-[90rem]">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-cream via-cream/80 to-transparent sm:w-12"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-cream via-cream/80 to-transparent sm:w-12"
          aria-hidden
        />

        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto overscroll-x-contain px-4 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-2.5 sm:px-6 lg:px-10"
          role="navigation"
          aria-label="Browse collections"
        >
          <Link
            ref={!activeSlug ? activeRef : undefined}
            href="/collections"
            prefetch
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-all',
              !activeSlug
                ? 'bg-maroon text-white shadow-sm shadow-maroon/20'
                : 'bg-white text-charcoal ring-1 ring-black/8 hover:ring-maroon/30 hover:text-maroon',
            )}
          >
            All
          </Link>

          {categories.map((cat) => {
            const isActive = activeSlug === cat.slug;
            return (
              <Link
                key={cat.id}
                ref={isActive ? activeRef : undefined}
                href={`/category/${cat.slug}`}
                prefetch
                onMouseEnter={() => prefetchCategory(cat.slug)}
                onFocus={() => prefetchCategory(cat.slug)}
                onTouchStart={() => prefetchCategory(cat.slug)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-xs font-medium tracking-[0.08em] transition-all',
                  isActive
                    ? 'bg-maroon font-semibold text-white shadow-sm shadow-maroon/20'
                    : 'bg-white text-charcoal ring-1 ring-black/8 hover:ring-maroon/30 hover:text-maroon',
                )}
              >
                <span
                  className={cn(
                    'relative h-7 w-7 overflow-hidden rounded-full',
                    isActive ? 'ring-2 ring-white/40' : 'bg-beige',
                  )}
                >
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        'flex h-full w-full items-center justify-center font-serif text-[0.7rem]',
                        isActive ? 'text-white/80' : 'text-maroon/40',
                      )}
                    >
                      {cat.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="max-w-[9rem] truncate sm:max-w-none">{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
