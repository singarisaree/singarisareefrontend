'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/products/product-card';
import { useLikedStore } from '@/stores/liked-store';
import { useLikedHydrated } from '@/hooks/use-liked-hydrated';
import type { Product } from '@/types';

function toProduct(item: {
  id: string;
  slug: string;
  name: string;
  defaultImage?: string;
  effectivePrice: number;
  mrp: number;
  displaySoldCount?: number;
  isComingSoon?: boolean;
  isOutOfStock?: boolean;
}): Product {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    sku: '',
    categoryId: '',
    description: '',
    price: item.effectivePrice,
    mrp: item.mrp,
    discount: 0,
    effectivePrice: item.effectivePrice,
    tags: [],
    soldCount: 0,
    baseSoldCount: 0,
    displaySoldCount: item.displaySoldCount ?? 0,
    isActive: true,
    isComingSoon: item.isComingSoon,
    isFeatured: false,
    defaultImage: item.defaultImage,
    totalStock: item.isOutOfStock ? 0 : 1,
    isOutOfStock: item.isOutOfStock,
    colors: [],
  };
}

export default function LikedProductsPage() {
  const hydrated = useLikedHydrated();
  const items = useLikedStore((s) => s.items);

  return (
    <>
      <div className="mx-auto min-h-[55vh] max-w-[90rem] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-8 border-b border-beige pb-4">
          <h1 className="font-serif text-2xl text-charcoal sm:text-3xl">Liked Products</h1>
          {hydrated && items.length > 0 ? (
            <p className="mt-1 text-sm text-brown-light">
              {items.length} {items.length === 1 ? 'product' : 'products'}
            </p>
          ) : null}
        </div>

        {!hydrated ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-beige" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <Heart className="h-12 w-12 text-maroon/40" strokeWidth={1.25} />
            <h2 className="mt-4 font-medium text-charcoal">No liked products yet</h2>
            <p className="mt-2 max-w-md text-sm text-brown-light">
              Tap the heart on any saree to save it here.
            </p>
            <Link href="/collections" className="mt-6">
              <Button variant="gold">Browse Collections</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <ProductCard key={item.id} product={toProduct(item)} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
