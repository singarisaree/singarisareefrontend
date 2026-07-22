import type { HeroBanner } from '@/types';
import { resolveHeroImageUrl } from '@/lib/image';

/**
 * Emits early <link rel="preload"> tags so the first hero image starts
 * downloading before the rest of the homepage paints.
 */
export function HeroImagePreload({ banners }: { banners: HeroBanner[] }) {
  const active = banners.filter((banner) => banner.isActive);
  const first = (active.length > 0 ? active : banners)[0];
  if (!first) return null;

  const desktop = resolveHeroImageUrl(first.imageUrl);
  const mobile = resolveHeroImageUrl(first.mobileImageUrl || first.imageUrl);
  if (!desktop && !mobile) return null;

  // Same asset for both breakpoints — one preload is enough.
  if (desktop && mobile && desktop === mobile) {
    return <link rel="preload" as="image" href={desktop} fetchPriority="high" />;
  }

  return (
    <>
      {mobile ? (
        <link
          rel="preload"
          as="image"
          href={mobile}
          media="(max-width: 639px)"
          fetchPriority="high"
        />
      ) : null}
      {desktop ? (
        <link
          rel="preload"
          as="image"
          href={desktop}
          media="(min-width: 640px)"
          fetchPriority="high"
        />
      ) : null}
    </>
  );
}
