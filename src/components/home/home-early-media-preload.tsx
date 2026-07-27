import { HomeInstagramPreload } from '@/components/home/home-instagram-preload';
import { HomeShowcasePreload } from '@/components/home/home-showcase-preload';
import { getCachedHomepage } from '@/lib/store-home';

/** Start showcase + Instagram video preload as early as possible on the home route. */
export async function HomeEarlyMediaPreload() {
  let showcaseItems: Awaited<ReturnType<typeof getCachedHomepage>>['showcaseItems'] = [];
  let instagramReels: Awaited<ReturnType<typeof getCachedHomepage>>['instagramReels'] = [];

  try {
    const home = await getCachedHomepage();
    showcaseItems = home.showcaseItems ?? [];
    instagramReels = home.instagramReels ?? [];
  } catch {
    /* below-fold will retry */
  }

  return (
    <>
      <HomeShowcasePreload items={showcaseItems} />
      <HomeInstagramPreload reels={instagramReels} />
    </>
  );
}
