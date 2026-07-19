'use client';

import { useCallback } from 'react';
import {
  parseAsInteger,
  parseAsStringEnum,
  useQueryState,
  type Options,
} from 'nuqs';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, type PageSizeOption } from '@/lib/pagination';

const NUQS_OPTIONS: Options = {
  history: 'replace',
  scroll: false,
  shallow: true,
};

const PAGE_SIZE_STRINGS = PAGE_SIZE_OPTIONS.map(String) as [string, ...string[]];

export function useAdminPagination() {
  const [page, setPageParam] = useQueryState(
    'page',
    parseAsInteger.withDefault(1).withOptions(NUQS_OPTIONS),
  );
  const [limitStr, setLimitParam] = useQueryState(
    'limit',
    parseAsStringEnum(PAGE_SIZE_STRINGS)
      .withDefault(String(DEFAULT_PAGE_SIZE))
      .withOptions(NUQS_OPTIONS),
  );

  const pageSize = (Number(limitStr) || DEFAULT_PAGE_SIZE) as PageSizeOption;

  const setPage = useCallback(
    (nextPage: number) => {
      void setPageParam(nextPage <= 1 ? null : nextPage);
    },
    [setPageParam],
  );

  const setPageSize = useCallback(
    (limit: PageSizeOption) => {
      void setPageParam(null);
      void setLimitParam(limit === DEFAULT_PAGE_SIZE ? null : String(limit));
    },
    [setPageParam, setLimitParam],
  );

  const resetPage = useCallback(() => {
    void setPageParam(null);
  }, [setPageParam]);

  return { page, pageSize, setPage, setPageSize, resetPage };
}
