import { ProductCard } from '@/components/products/product-card';
import { CollectionFilters } from '@/components/collections/collection-filters';
import { StoreFooter } from '@/components/layout/store-footer';
import { ProductRoutesPrefetch } from '@/components/storefront/product-routes-prefetch';
import { getCachedCategoryPage } from '@/lib/store-category-page';
import { serverStore } from '@/lib/server-store';
import { categoryBreadcrumbJsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 30;

export async function generateStaticParams() {
  try {
    const categories = await serverStore.getCategoriesFresh();
    return categories.slice(0, 15).map((category) => ({ slug: category.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getCachedCategoryPage(slug);
    if (!page) return { title: 'Category' };
    const { category } = page;
    const description = category.seoDesc || category.description || `Shop ${category.name} sarees at Singari Sarees`;
    const image = category.imageUrl;
    return {
      title: category.seoTitle || category.name,
      description,
      alternates: { canonical: `/category/${slug}` },
      openGraph: {
        title: category.name,
        description,
        url: `/category/${slug}`,
        images: image ? [{ url: image, alt: category.name }] : undefined,
      },
    };
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  let page;
  try {
    page = await getCachedCategoryPage(slug);
  } catch {
    notFound();
  }

  if (!page) notFound();

  const { category, categories, products } = page;
  const crumbsLd = categoryBreadcrumbJsonLd(category);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}
      />
      <ProductRoutesPrefetch slugs={products.slice(0, 12).map((p) => p.slug)} />
      <div className="bg-beige py-6 pattern-mandala sm:py-12">
        <div className="mx-auto max-w-[90rem] px-4 text-center sm:px-6 lg:px-10">
          <p className="text-xs font-semibold tracking-[0.3em] text-maroon">COLLECTION</p>
          <h1 className="mt-2 font-serif text-3xl tracking-[0.1em] text-charcoal sm:text-4xl">{category.name}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10">
        <CollectionFilters categories={categories} activeSlug={slug} />

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-brown-light">No products in this category yet.</p>
        )}
      </div>

      <StoreFooter />
    </>
  );
}
