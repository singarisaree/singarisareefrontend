'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { PaginationMeta } from '@/lib/pagination';

/** If the URL page is past the last page (e.g. after filters shrink results), go back to page 1. */
export function useClampPaginationPage(
  meta: PaginationMeta | undefined,
  page: number,
  setPage: (page: number) => void,
) {
  const clampedRef = useRef(false);

  useLayoutEffect(() => {
    if (!meta || meta.total === 0) return;
    if (page > meta.totalPages) {
      clampedRef.current = true;
      setPage(1);
    }
  }, [meta, page, setPage]);

  useEffect(() => {
    if (clampedRef.current && meta && meta.total > 0 && page === 1) {
      clampedRef.current = false;
    }
  }, [meta, page]);
}

export function isPaginationMismatch(
  meta: PaginationMeta | undefined,
  ordersLength: number,
  page: number,
) {
  if (!meta || meta.total === 0) return false;
  if (ordersLength > 0) return false;
  return page > meta.totalPages || meta.total > 0;
}
