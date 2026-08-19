import type { HeroBanner, Category, Product } from '@/types';
import { resolveHeroImageUrl } from '@/lib/image';

/**
 * Emits early <link rel="preload"> tags so banners, collections, and products
 * start downloading immediately before the homepage paints.
 */
export function HeroImagePreload({
  banners,
  categories = [],
  products = [],
  ourStoryImageUrl,
}: {
  banners: HeroBanner[];
  categories?: Category[];
  products?: Product[];
  ourStoryImageUrl?: string;
}) {
  const active = banners.filter((banner) => banner.isActive);
  const first = (active.length > 0 ? active : banners)[0];
  const preloads: React.ReactNode[] = [];

  if (first) {
    const desktop = resolveHeroImageUrl(first.imageUrl);
    const mobile = resolveHeroImageUrl(first.mobileImageUrl || first.imageUrl);
    if (desktop && mobile && desktop === mobile) {
      preloads.push(<link key="hero" rel="preload" as="image" href={desktop} fetchPriority="high" />);
    } else {
      if (mobile) {
        preloads.push(
          <link
            key="hero-mobile"
            rel="preload"
            as="image"
            href={mobile}
            media="(max-width: 639px)"
            fetchPriority="high"
          />,
        );
      }
      if (desktop) {
        preloads.push(
          <link
            key="hero-desktop"
            rel="preload"
            as="image"
            href={desktop}
            media="(min-width: 640px)"
            fetchPriority="high"
          />,
        );
      }
    }
  }

  // Preload first 4 category card images
  categories.slice(0, 4).forEach((cat) => {
    if (cat.imageUrl) {
      preloads.push(<link key={`cat-${cat.id}`} rel="preload" as="image" href={cat.imageUrl} />);
    }
  });

  // Preload first 4 product card main images
  products.slice(0, 4).forEach((prod) => {
    if (prod.defaultImage) {
      preloads.push(<link key={`prod-${prod.id}`} rel="preload" as="image" href={prod.defaultImage} />);
    }
  });

  // Preload Our Story Image
  if (ourStoryImageUrl) {
    preloads.push(<link key="our-story" rel="preload" as="image" href={ourStoryImageUrl} />);
  }

  return <>{preloads}</>;
}
