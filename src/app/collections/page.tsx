import { ProductCard } from '@/components/products/product-card';
import { CollectionFilters } from '@/components/collections/collection-filters';
import { StoreFooter } from '@/components/layout/store-footer';
import { ProductRoutesPrefetch } from '@/components/storefront/product-routes-prefetch';
import { getCachedCollectionsPage } from '@/lib/store-home';
import type { Metadata } from 'next';
import type { Product, Category } from '@/types';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Browse our complete collection of premium handcrafted sarees.',
};

export const revalidate = 60;

export default async function CollectionsPage() {
  const { products, categories } = await getCachedCollectionsPage().catch(() => ({
    products: [] as Product[],
    categories: [] as Category[],
  }));

  return (
    <>
      <ProductRoutesPrefetch slugs={products.slice(0, 24).map((p) => p.slug)} />
      <div className="bg-beige py-6 pattern-mandala sm:py-12">
        <div className="mx-auto max-w-[90rem] px-4 text-center sm:px-6 lg:px-10">
          <p className="text-xs font-semibold tracking-[0.3em] text-maroon">COLLECTION</p>
          <h1 className="mt-2 font-serif text-3xl tracking-[0.1em] text-charcoal sm:text-4xl">
            ALL COLLECTIONS
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10">
        <CollectionFilters categories={categories} />

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-muted">No products available yet.</p>
        )}
      </div>

      <StoreFooter />
    </>
  );
}
