import { HomeHashScroll } from '@/components/home/home-hash-scroll';
import { HomePageContent } from '@/app/home-page-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
  alternates: { canonical: '/' },
};

export const revalidate = 60;

/**
 * Block until homepage API data is ready, then send the full page.
 * No root loading.tsx / Suspense shell — avoids the blank cream flash.
 */
export default async function HomePage() {
  // Await the async RSC explicitly so HTML is not sent until data resolves.
  const content = await HomePageContent();

  return (
    <>
      <HomeHashScroll />
      {content}
    </>
  );
}
