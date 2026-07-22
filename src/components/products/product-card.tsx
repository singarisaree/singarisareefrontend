import Image from 'next/image';
import { ProductCardLink } from '@/components/products/product-card-link';
import { ProductLikeButton } from '@/components/products/product-like-button';
import { formatAmount, calculateDiscount, isProductFullyOutOfStock } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
  /** LCP image — use for above-the-fold product cards */
  priority?: boolean;
}

export function ProductCard({ product, variant = 'default', priority = false }: ProductCardProps) {
  const discount = calculateDiscount(product.mrp, product.effectivePrice);
  const productHref = `/product/${product.slug}`;

  return (
    <ProductCardLink href={productHref} className="group block">
      <article className="overflow-hidden rounded-lg border border-black/5 bg-white">
        <div className="relative aspect-[3/4] overflow-hidden bg-beige">
          {product.defaultImage ? (
            <Image
              src={product.defaultImage}
              alt={product.name}
              fill
              sizes={
                variant === 'compact'
                  ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw'
                  : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw'
              }
              className="object-contain object-center transition-transform duration-700 group-hover:scale-[1.02]"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              quality={80}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">No Image</div>
          )}
          {discount > 0 && variant === 'default' && (
            <span className="absolute left-3 top-3 bg-maroon px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white">
              {discount}% OFF
            </span>
          )}
          <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
            <ProductLikeButton
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                defaultImage: product.defaultImage,
                effectivePrice: product.effectivePrice,
                mrp: product.mrp,
                displaySoldCount: product.displaySoldCount,
                isComingSoon: product.isComingSoon,
                isOutOfStock: isProductFullyOutOfStock(product),
              }}
            />
          </div>
          {product.isComingSoon ? (
            <span className="absolute inset-0 flex items-center justify-center bg-cream/80 text-sm font-semibold tracking-wide text-maroon">
              Coming Soon
            </span>
          ) : (
            isProductFullyOutOfStock(product) && (
              <span className="absolute inset-0 flex items-center justify-center bg-cream/80 text-sm font-semibold tracking-wide text-red-400">
                Out of Stock
              </span>
            )
          )}
        </div>
        <div className="px-2 py-3 text-center sm:px-3 sm:py-4 sm:text-left">
          <h3 className="line-clamp-2 font-serif text-sm text-charcoal transition-colors group-hover:text-maroon sm:text-base">
            {product.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 sm:justify-start">
            <span className="text-sm font-semibold text-charcoal sm:text-base">
              <span className="mr-1 text-[0.65rem] font-semibold tracking-wide text-brown sm:text-xs">
                Rs.
              </span>
              {formatAmount(product.effectivePrice)}
            </span>
            {product.mrp > product.effectivePrice && (
              <span className="text-xs text-muted line-through">
                <span className="mr-1 font-medium">MRP</span>
                {formatAmount(product.mrp)}
              </span>
            )}
          </div>
          {product.displaySoldCount > 0 && (
            <p className="mt-1 text-[0.65rem] font-medium text-maroon sm:text-xs">
              🔥 {product.displaySoldCount} customers chose this
            </p>
          )}
        </div>
      </article>
    </ProductCardLink>
  );
}
