import { Suspense } from 'react';
import { serverStore } from '@/lib/server-store';
import { ShowcaseFeed } from '@/components/showcase/showcase-feed';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Singari Showcase',
  robots: { index: false, follow: true },
};

async function loadShowcase() {
  try {
    const home = await serverStore.getHomepage();
    return home.showcaseItems ?? [];
  } catch {
    return [];
  }
}

export default async function ShowcasePage() {
  const items = await loadShowcase();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <Suspense fallback={<div className="h-full bg-black" />}>
        <ShowcaseFeed items={items} />
      </Suspense>
    </div>
  );
}
