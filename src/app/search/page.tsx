import { ProductCard } from '@/components/products/product-card';
import { StoreFooter } from '@/components/layout/store-footer';
import { serverStore } from '@/lib/server-store';
import type { Product } from '@/types';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: true, follow: true },
};

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  let products: Product[] = [];
  if (query.length >= 2) {
    try {
      products = await serverStore.getProducts({ search: query, limit: '48', isActive: 'true' });
    } catch {
      products = [];
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-10">
        <h1 className="font-serif text-2xl tracking-wide text-charcoal sm:text-3xl">Search</h1>
        {query ? (
          <p className="mt-2 text-sm text-brown-light">
            {products.length} result{products.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
        ) : (
          <p className="mt-2 text-sm text-brown-light">
            Search by product name or SKU from the navigation bar.
          </p>
        )}

        {query.length >= 2 && products.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {query.length >= 2 && products.length === 0 && (
          <p className="mt-12 text-center text-muted">No sarees found. Try a different search.</p>
        )}

        {query.length > 0 && query.length < 2 && (
          <p className="mt-8 text-sm text-muted">Type at least 2 characters to search.</p>
        )}

        <p className="mt-10">
          <Link href="/collections" className="text-sm font-medium text-maroon hover:text-maroon-dark">
            Browse all collections →
          </Link>
        </p>
      </div>
      <Suspense fallback={null}>
        <StoreFooter />
      </Suspense>
    </>
  );
}
