import { cache } from 'react';
import { serverStore } from '@/lib/server-store';

/** Dedupe product fetches within a single server request (page + metadata). */
export const getCachedProductBySlug = cache((slug: string) =>
  serverStore.getProductBySlug(slug),
);
