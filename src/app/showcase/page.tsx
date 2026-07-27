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

function parseStartIndex(raw: string | undefined, max: number): number {
  const n = Number(raw ?? '0');
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, n));
}

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const items = await loadShowcase();
  const { start } = await searchParams;
  const initialStartIndex = parseStartIndex(start, Math.max(0, items.length - 1));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <ShowcaseFeed items={items} initialStartIndex={initialStartIndex} />
    </div>
  );
}
