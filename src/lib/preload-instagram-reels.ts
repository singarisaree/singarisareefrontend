import { preloadShowcaseVideos } from '@/lib/preload-showcase-videos';

const FIRST_BATCH = 5;
const MAX_REELS = 10;
const PRELOAD_TIMEOUT_MS = 20_000;

let firstBatchPromise: Promise<void> | null = null;
let firstBatchKey = '';

function batchKey(urls: string[]): string {
  return urls.slice(0, FIRST_BATCH).join('\0');
}

/** Preload first 5 reels (shared — homepage + slider use the same promise). */
export function preloadInstagramReelsFirstBatch(urls: string[]): Promise<void> {
  if (typeof window === 'undefined' || !urls.length) return Promise.resolve();
  const first = urls.slice(0, FIRST_BATCH);
  const key = batchKey(first);
  if (firstBatchPromise && firstBatchKey === key) return firstBatchPromise;
  firstBatchKey = key;
  firstBatchPromise = preloadShowcaseVideos(first);
  return firstBatchPromise;
}

/** Preload reels 6–10 after the first batch. */
export function preloadInstagramReelsSecondBatch(urls: string[]): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const rest = urls.slice(FIRST_BATCH, MAX_REELS);
  if (!rest.length) return Promise.resolve();
  return preloadShowcaseVideos(rest);
}

export { FIRST_BATCH, MAX_REELS, PRELOAD_TIMEOUT_MS };
