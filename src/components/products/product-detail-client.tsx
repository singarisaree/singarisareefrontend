'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ShoppingCart,
  Flame,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { ShippingReturnsAccordion } from '@/components/products/shipping-returns-accordion';
import { ProductLikeButton } from '@/components/products/product-like-button';
import { ProductImageLightbox } from '@/components/products/product-image-lightbox';
import { useCartStore } from '@/stores/cart-store';
import { formatAmount, calculateDiscount, isProductFullyOutOfStock } from '@/lib/utils';
import { InstagramAppLink } from '@/components/instagram-app-link';
import type { Product, ProductColor } from '@/types';

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(
    product.colors[0] ?? null,
  );
  const selectedCartItem = useCartStore((s) =>
    s.items.find((item) => item.productColorId === (selectedColor?.id ?? '')),
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!product.colors.length) {
      setSelectedColor(null);
      return;
    }
    setSelectedColor((current) => {
      const match = product.colors.find((color) => color.id === current?.id);
      return match ?? product.colors[0];
    });
  }, [product]);

  const images = selectedColor?.images || [];
  const galleryImages =
    images.length > 0
      ? images
      : product.defaultImage
        ? [{
            id: 'default',
            url: product.defaultImage,
            altText: product.name,
            sortOrder: 0,
            isDefault: true,
          }]
        : [];
  const firstImage = galleryImages[0]?.url || product.defaultImage;
  const currentImage = galleryImages[selectedImageIndex]?.url || firstImage;
  const discount = calculateDiscount(product.mrp, product.effectivePrice);
  const availableStock = selectedColor?.availableStock ?? 0;
  const hasMultipleImages = galleryImages.length > 1;
  const recentPurchaseCount = Math.max(1, product.displaySoldCount || product.baseSoldCount || 1);
  // Stable per-product count (143–988) so every product page shows a different value.
  const viewingCount = (() => {
    const seed = product.id || product.slug || product.name;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return 143 + (hash % (988 - 143 + 1));
  })();
  const formattedWeight =
    product.weight != null && product.weight > 0
      ? product.weight >= 1000
        ? `${(product.weight / 1000).toFixed(product.weight % 1000 === 0 ? 0 : 2)} kg`
        : `${product.weight} g`
      : null;
  const productDetailPoints = (product.productDetails || '')
    .split('\n')
    .map((line) => line.replace(/^[\s•\-\*\d.)]+/, '').trim())
    .filter(Boolean);

  const goToPrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  };

  const goToNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIndex((i) => (i + 1) % galleryImages.length);
  };

  const handleAddToCart = () => {
    if (!selectedColor || availableStock === 0) {
      toast.error('This color is out of stock');
      return;
    }
    addItem({
      productId: product.id,
      productColorId: selectedColor.id,
      productName: product.name,
      colorName: selectedColor.name,
      slug: product.slug,
      imageUrl: firstImage || '',
      price: product.effectivePrice,
      mrp: product.mrp,
      quantity: 1,
      maxStock: availableStock,
    });
    toast.quick('Added to cart');
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-charcoal transition-colors hover:text-maroon"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col">
              <div
                role="button"
                tabIndex={0}
                className="group relative aspect-[3/4] w-full max-h-[min(78dvh,720px)] cursor-zoom-in overflow-hidden rounded-lg bg-beige text-left"
                onClick={() => setLightboxOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setLightboxOpen(true);
                  }
                }}
                aria-label={`Open full-screen images for ${product.name}`}
              >
                {currentImage && (
                  <Image
                    src={currentImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover object-center"
                    priority={selectedImageIndex === 0}
                    loading={selectedImageIndex === 0 ? undefined : 'lazy'}
                    quality={80}
                  />
                )}
                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-cream/90 p-2 shadow-sm transition-colors hover:bg-cream"
                      onClick={goToPrevImage}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5 text-charcoal" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-cream/90 p-2 shadow-sm transition-colors hover:bg-cream"
                      onClick={goToNextImage}
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5 text-charcoal" />
                    </button>
                    <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-2">
                      {galleryImages.map((img, i) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedImageIndex(i);
                          }}
                          aria-label={`View image ${i + 1}`}
                          className={`h-2 w-2 rounded-full transition-all ${
                            i === selectedImageIndex
                              ? 'scale-110 bg-maroon'
                              : 'bg-charcoal/30 hover:bg-charcoal/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedImageIndex(i)}
                      className={`relative aspect-[3/4] h-20 w-auto shrink-0 overflow-hidden rounded border-2 transition-colors sm:h-24 ${
                        i === selectedImageIndex ? 'border-gold' : 'border-gold/20 hover:border-gold/50'
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        sizes="4rem"
                        className="object-cover object-center"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            {product.category && (
              <Link
                href={`/category/${product.category.slug}`}
                prefetch
                className="text-xs tracking-wider text-maroon uppercase hover:underline"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="mt-2 font-serif text-3xl text-charcoal lg:text-4xl">{product.name}</h1>
            {product.sku?.trim() ? (
              <p className="mt-1.5 text-sm text-brown-light">
                SKU:{' '}
                <span className="font-medium tracking-wide text-charcoal">{product.sku}</span>
              </p>
            ) : null}
            <div className="mt-4 space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-2xl font-medium text-charcoal">
                  <span className="mr-1.5 text-sm font-semibold tracking-wide text-brown">Rs.</span>
                  {formatAmount(product.effectivePrice)}
                </p>
                {product.mrp > product.effectivePrice && (
                  <p className="text-lg text-brown-light">
                    <span className="mr-1.5 text-sm font-medium tracking-wide">MRP</span>
                    <span className="line-through">{formatAmount(product.mrp)}</span>
                    {discount > 0 && (
                      <span className="ml-2 text-sm text-gold">({discount}% off)</span>
                    )}
                  </p>
                )}
              </div>
              <p className="text-xs text-brown-light">Inclusive of all taxes</p>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-brown">
                Color: <span className="text-maroon">{selectedColor?.name}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => { setSelectedColor(color); setSelectedImageIndex(0); }}
                    className={`rounded-full border-2 px-4 py-1.5 text-sm transition-all ${
                      selectedColor?.id === color.id
                        ? 'border-gold bg-gold/10 text-charcoal'
                        : 'border-gold/30 text-brown hover:border-gold'
                    }`}
                    aria-label={`Select color ${color.name}`}
                  >
                    {color.hexCode && (
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: color.hexCode }}
                      />
                    )}
                    {color.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedColor?.instagramVideoUrl ? (
              <p className="mt-4 text-sm">
                <InstagramAppLink
                  instagramUrl={selectedColor.instagramVideoUrl}
                  className="font-medium text-maroon underline underline-offset-4 transition-colors hover:text-gold"
                >
                  Click here to watch on Instagram
                </InstagramAppLink>
              </p>
            ) : null}

            {product.fabric && (
              <p className="mt-4 text-sm text-brown-light">
                <span className="font-medium text-brown">Fabric:</span>{' '}
                <span className="text-maroon">{product.fabric}</span>
              </p>
            )}
            {formattedWeight ? (
              <p className="mt-2 text-sm text-brown-light">
                <span className="font-medium text-brown">Weight:</span>{' '}
                <span className="text-maroon">{formattedWeight}</span>
              </p>
            ) : null}

            <div className="mt-6">
              <span
                className={`font-medium ${
                  availableStock > 0 ? 'text-sm text-red-400' : 'text-lg text-red-400'
                }`}
              >
                {availableStock > 0 ? `${availableStock} available` : 'Out of stock'}
              </span>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-5">
              {selectedCartItem ? (
                <div className="flex h-10 w-[70%] items-center justify-between rounded-md bg-gold px-1.5 py-0.5 text-cream sm:h-11 sm:w-auto sm:min-w-48 sm:px-2 sm:py-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCartItem.quantity <= 1) {
                        removeItem(selectedCartItem.productColorId);
                        return;
                      }
                      updateQuantity(selectedCartItem.productColorId, selectedCartItem.quantity - 1);
                    }}
                    className="rounded p-1.5 transition-colors hover:bg-maroon/30 sm:p-2"
                    aria-label="Decrease cart quantity"
                  >
                    <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                  <span className="px-2 text-xs font-semibold text-cream sm:px-3 sm:text-sm">
                    {selectedCartItem.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(selectedCartItem.productColorId, selectedCartItem.quantity + 1)
                    }
                    disabled={selectedCartItem.quantity >= availableStock}
                    className="rounded p-1.5 transition-colors hover:bg-maroon/30 disabled:cursor-not-allowed disabled:opacity-40 sm:p-2"
                    aria-label="Increase cart quantity"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="gold"
                  size="lg"
                  className="h-10 w-[70%] text-xs sm:h-11 sm:w-auto sm:text-sm"
                  onClick={handleAddToCart}
                  disabled={availableStock === 0 || product.isComingSoon}
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  {product.isComingSoon ? 'Coming Soon' : 'Add to Cart'}
                </Button>
              )}
              <ProductLikeButton
                size="md"
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
                className="border border-maroon/15"
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-red-50 shadow-sm">
              <div className="flex items-center gap-2 border-b border-orange-100 bg-orange-100/60 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
                  <Flame className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-charcoal">Popular in the last 24 hours</p>
                  <p className="text-[11px] text-brown-light">Customers are loving this saree</p>
                </div>
              </div>
              <div className="space-y-3 px-4 py-4 text-sm">
                <div className="flex items-center gap-3 text-charcoal">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <span>
                    <strong>{recentPurchaseCount}</strong> people purchased this product
                  </span>
                </div>
                <div className="flex items-center gap-3 text-charcoal">
                  <Eye className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span>
                    <strong>{viewingCount}</strong> customers are viewing this item
                  </span>
                </div>
                <div className="flex items-center gap-3 font-semibold text-red-600">
                  <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Selling fast – order before stock runs out</span>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-6 border-t border-gold/20 pt-8">
              <div>
                <h2 className="font-serif text-lg text-maroon">Description</h2>
                <p className="mt-2 text-sm leading-relaxed text-brown-light">{product.description}</p>
              </div>

              {productDetailPoints.length > 0 ? (
                  <div>
                    <h2 className="font-serif text-lg text-maroon">Product details</h2>
                    <ul className="mt-3 space-y-2">
                      {productDetailPoints.map((point, index) => (
                        <li
                          key={`${index}-${point}`}
                          className="flex gap-2.5 text-sm leading-relaxed text-brown-light"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-maroon" aria-hidden />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
              ) : null}

              <ShippingReturnsAccordion />

              {product.care && (
                <div>
                  <h3 className="text-sm font-medium text-charcoal">Care Instructions</h3>
                  <p className="mt-1 text-sm text-brown-light">{product.care}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ProductImageLightbox
        images={galleryImages}
        productName={product.name}
        initialIndex={selectedImageIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setSelectedImageIndex}
      />
    </>
  );
}
