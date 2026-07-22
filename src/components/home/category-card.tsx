'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const router = useRouter();
  const href = `/category/${category.slug}`;

  const warmRoute = () => {
    router.prefetch(href);
  };

  return (
    <Link
      href={href}
      prefetch
      className="group relative block overflow-hidden"
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      onTouchStart={warmRoute}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-beige">
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt={category.name}
            fill
            sizes="160px"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            quality={80}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-b from-beige to-maroon/10">
            <span className="font-serif text-4xl text-maroon/20">{category.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-dark/70 via-charcoal-dark/20 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4 sm:p-5">
          <h3 className="font-serif text-sm font-medium tracking-wide text-white sm:text-base">
            {category.name}
          </h3>
          <span className="mt-1 inline-flex items-center gap-1 text-[0.65rem] font-semibold tracking-[0.15em] text-gold-light transition-colors group-hover:text-gold sm:text-xs">
            SHOP NOW
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
