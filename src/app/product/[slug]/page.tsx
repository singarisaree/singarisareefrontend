import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductDetailClient } from '@/components/products/product-detail-client';
import { ProductReviewsAsync } from '@/components/products/product-reviews-async';
import { RelatedProductsAsync } from '@/components/products/related-products-async';
import { StoreFooter } from '@/components/layout/store-footer';
import { getCachedProductBySlug } from '@/lib/store-product';
import { serverStore } from '@/lib/server-store';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/json-ld';

export const revalidate = 30;

export async function generateStaticParams() {
  try {
    const limit = 200;
    const seen = new Set<string>();
    const params: Array<{ slug: string }> = [];
    let page = 1;

    while (page <= 10) {
      const products = await serverStore.getProductsFresh({
        limit: String(limit),
        page: String(page),
        isActive: 'true',
      });
      if (!products.length) break;

      for (const product of products) {
        if (seen.has(product.slug)) continue;
        seen.add(product.slug);
        params.push({ slug: product.slug });
      }

      if (products.length < limit) break;
      page += 1;
    }

    return params;
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getCachedProductBySlug(slug);
    if (!product) return { title: 'Product' };
    const image = product.defaultImage || product.colors?.[0]?.images?.[0]?.url;
    const description = product.seoDesc || product.description?.slice(0, 160);
    return {
      title: product.seoTitle || product.name,
      description,
      alternates: { canonical: `/product/${slug}` },
      openGraph: {
        title: product.name,
        description: description ?? undefined,
        url: `/product/${slug}`,
        type: 'website',
        images: image ? [{ url: image, alt: product.name }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description: description ?? undefined,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product;
  try {
    product = await getCachedProductBySlug(slug);
  } catch {
    notFound();
  }

  if (!product) notFound();

  const productLd = productJsonLd(product);
  const crumbsLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Collections', path: '/collections' },
    ...(product.category
      ? [{ name: product.category.name, path: `/category/${product.category.slug}` }]
      : []),
    { name: product.name, path: `/product/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}
      />
      <ProductDetailClient product={product} />
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <Suspense fallback={null}>
          <ProductReviewsAsync productId={product.id} className="mt-12 lg:mt-16" />
        </Suspense>
        <Suspense fallback={null}>
          <RelatedProductsAsync
            productId={product.id}
            category={product.category}
            className="mt-12 lg:mt-16"
          />
        </Suspense>
      </div>
      <StoreFooter />
    </>
  );
}
