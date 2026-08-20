import { getCachedHomepage } from '@/lib/store-home';
import { serverStore } from '@/lib/server-store';
import { HomePageClient } from '@/components/home/home-page-client';
import type { HeroBanner, Category, Product, PublicSettings } from '@/types';

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
    return { banners, categories, products, settings, instagramReels: [], showcaseItems: [] };
  }
}

export async function HomePageContent() {
  const home = await loadHomepageData();
  return <HomePageClient initialHome={home} />;
}
