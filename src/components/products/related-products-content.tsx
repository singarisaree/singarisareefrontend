import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/products/product-card';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface RelatedProductsContentProps {
  related: Product[];
  category?: { name: string; slug: string };
  className?: string;
}

export function RelatedProductsContent({
  related,
  category,
  className,
}: RelatedProductsContentProps) {
  return (
    <section
      aria-labelledby="related-products-heading"
      className={cn('w-full border-t border-gold/20 pt-12 lg:pt-16', className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-gold">
            <Sparkles className="h-4 w-4" aria-hidden />
            <p className="text-xs font-medium tracking-[0.2em] uppercase">Curated for you</p>
          </div>
          <h2
            id="related-products-heading"
            className="mt-2 font-serif text-2xl text-charcoal lg:text-3xl"
          >
            You May Also Like
          </h2>
          <p className="mt-2 hidden text-sm leading-relaxed text-brown-light sm:block">
            {category
              ? `Explore more from our ${category.name} collection — pieces chosen to pair beautifully with what you are viewing.`
              : 'Handpicked sarees from our collection that complement your current selection.'}
          </p>
        </div>

        {category && (
          <Link
            href={`/category/${category.slug}`}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-maroon transition-colors hover:text-charcoal"
          >
            View all {category.name}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>

      {related.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {related.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-gold/15 bg-beige/30 px-6 py-10 text-center">
          <p className="font-serif text-lg text-charcoal">Discover more in our collections</p>
          <p className="mt-2 text-sm text-brown-light">Browse our full range of handcrafted sarees.</p>
          <Link
            href="/collections"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-maroon hover:underline"
          >
            Shop all collections
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
