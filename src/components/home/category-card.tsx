'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';
import { resolveStorefrontImageUrl } from '@/lib/image';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const router = useRouter();
  const href = `/category/${category.slug}`;

  const warmRoute = () => {
    router.prefetch(href);
  };

  const imageUrl = category.imageUrl ? resolveStorefrontImageUrl(category.imageUrl) : null;

  return (
    <Link
      href={href}
      prefetch
      className="group relative block overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-500"
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      onTouchStart={warmRoute}
    >
      <div className="relative aspect-[3/4.6] sm:aspect-[3/4] overflow-hidden rounded-lg bg-beige">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={category.name}
            fill
            sizes="(max-width: 640px) 42vw, (max-width: 1024px) 11rem, 14rem"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            quality={100}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-b from-beige to-maroon/10">
            <span className="font-serif text-4xl text-maroon/20">{category.name.charAt(0)}</span>
          </div>
        )}
        {/* Dark overlay gradient only at the bottom for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/70 via-black/70 to-transparent" />
        
        {/* Content Section */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col items-start gap-3 sm:gap-4">
          <div className="space-y-1.5 text-left">
            {category.description && category.description.trim().length > 1 && (
              <span className="block text-[0.6rem] font-semibold tracking-[0.2em] text-gold uppercase sm:text-[0.7rem]">
                {category.description}
              </span>
            )}
            <h3 className="font-serif text-xl font-bold leading-tight text-white sm:text-[1.625rem] md:text-2xl line-clamp-2">
              {category.name}
            </h3>
          </div>
          
        </div>
      </div>
    </Link>
  );
}
