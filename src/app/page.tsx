import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { HeroSection } from '@/components/home/hero-section';
import { HeroImagePreload } from '@/components/home/hero-image-preload';
import { TrustBar } from '@/components/home/trust-bar';
import { SectionHeading } from '@/components/home/section-heading';
import { CategoryCard } from '@/components/home/category-card';
import { OurStorySection } from '@/components/home/our-story-section';
import { NewsletterBanner } from '@/components/home/newsletter-banner';
import { InstagramReelsSlider } from '@/components/home/instagram-reels-slider';
import { ProductCard } from '@/components/products/product-card';
import { ProductRoutesPrefetch } from '@/components/storefront/product-routes-prefetch';
import { StoreSettingsSync } from '@/components/store-settings-provider';
import { StoreFooter } from '@/components/layout/store-footer';
import { getCachedHomepage } from '@/lib/store-home';
import { serverStore } from '@/lib/server-store';
import type { Metadata } from 'next';
import type { PublicSettings, HeroBanner, Category, Product } from '@/types';

export const metadata: Metadata = {
  title: 'Home',
  alternates: { canonical: '/' },
};

export const revalidate = 60;

async function loadHomepageData() {
  try {
    return await getCachedHomepage();
  } catch {
    const [banners, categories, settings, products] = await Promise.all([
      serverStore.getBanners().catch(() => [] as HeroBanner[]),
      serverStore.getCategories().catch(() => [] as Category[]),
      serverStore.getSettings().catch(() => ({} as PublicSettings)),
      serverStore
        .getProducts({ limit: '10', sortBy: 'createdAt', sortOrder: 'desc' })
        .catch(() => [] as Product[]),
    ]);
    return { banners, categories, products, settings, instagramReels: [] };
  }
}

/** Hero first — banners-only so the LCP image can paint ASAP. */
async function HomeHero() {
  const banners = await serverStore.getBanners().catch(() => [] as HeroBanner[]);

  return (
    <>
      <HeroImagePreload banners={banners} />
      <HeroSection banners={banners} />
    </>
  );
}

async function HomeBelowFold() {
  const { categories, products, settings, instagramReels = [] } = await loadHomepageData();
  const reelItems = instagramReels.map((reel) => ({
    id: reel.id,
    videoUrl: reel.videoUrl,
    instagramUrl: reel.instagramUrl,
  }));

  return (
    <>
      <StoreSettingsSync settings={settings} />
      <ProductRoutesPrefetch slugs={products.slice(0, 24).map((p) => p.slug)} />
      <TrustBar />

      <section className="py-16 sm:py-20" aria-labelledby="collections-heading">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
          <SectionHeading title="SHOP BY COLLECTION" />
          <div className="mt-10 -mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
            <div className="flex w-max gap-3 sm:gap-4 lg:gap-5">
              {categories.slice(0, 100).map((category) => (
                <div
                  key={category.id}
                  className="w-[42vw] max-w-[11.66rem] shrink-0 sm:w-48 sm:max-w-none lg:w-56"
                >
                  <CategoryCard category={category} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#faf6f1] py-16 sm:py-20" aria-labelledby="new-arrivals">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
          <h2 id="new-arrivals" className="font-serif text-xl tracking-[0.2em] text-charcoal sm:text-2xl">
            NEW ARRIVALS
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-5">
            {products.slice(0, 10).map((product, i) => (
              <ProductCard key={product.id} product={product} variant="compact" priority={i < 2} />
            ))}
          </div>
          {products.length > 0 && (
            <div className="mt-10 flex justify-center">
              <Link
                href="/collections"
                prefetch
                className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-maroon px-8 text-sm font-semibold tracking-[0.18em] text-white shadow-md shadow-maroon/25 transition-all hover:bg-maroon-dark hover:shadow-lg hover:shadow-maroon/30 active:scale-[0.98] sm:max-w-sm sm:min-h-[3.25rem] sm:px-10 sm:text-base"
              >
                VIEW ALL
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
              </Link>
            </div>
          )}
          {products.length === 0 && (
            <p className="py-12 text-center text-muted">New arrivals coming soon.</p>
          )}
        </div>
      </section>

      <OurStorySection imageUrl={settings.our_story_image_url} />

      <section className="relative overflow-hidden bg-gradient-to-br from-beige to-cream py-16 sm:py-20">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-maroon/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5">
            <svg className="h-4 w-4 text-maroon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            <span className="text-xs font-medium tracking-wide text-maroon">INSTAGRAM</span>
          </div>
          {reelItems.length > 0 && (
            <InstagramReelsSlider reels={reelItems} className="mt-8 text-left" />
          )}
          <h2 className="mt-5 font-serif text-2xl tracking-wide text-charcoal sm:text-3xl">
            Join Our Saree Community
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-brown-light">
            Get styling inspiration, behind-the-scenes sneak peeks, and be the first to know about
            new drops and exclusive offers.
          </p>
          <a
            href="https://www.instagram.com/sareeby_singari?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-7 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#dc2743] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all hover:scale-105 hover:shadow-pink-500/40"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            Follow @sareeby_singari
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </section>

      <NewsletterBanner />
      <StoreFooter />
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <Suspense
        fallback={
          <div
            className="min-h-[32rem] bg-beige pattern-mandala sm:min-h-[38rem] lg:min-h-[42rem]"
            aria-hidden
          />
        }
      >
        <HomeHero />
      </Suspense>
      <Suspense fallback={null}>
        <HomeBelowFold />
      </Suspense>
    </>
  );
}
