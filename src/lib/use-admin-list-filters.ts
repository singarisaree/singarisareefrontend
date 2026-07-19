'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
  type Options,
} from 'nuqs';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const NUQS_OPTIONS: Options = {
  history: 'replace',
  scroll: false,
  shallow: true,
};

/**
 * Debounced search synced to URL `q`.
 * Always resets `page` so results come from the full filtered set (page 1), not the current page.
 */
export function useAdminSearchParam(delayMs = 350) {
  const [{ q: urlValue }, setParams] = useQueryStates(
    {
      q: parseAsString.withDefault(''),
      page: parseAsInteger,
    },
    NUQS_OPTIONS,
  );

  const [search, setSearchInput] = useState(urlValue);
  const debouncedSearch = useDebouncedValue(search, delayMs);

  useEffect(() => {
    setSearchInput(urlValue);
  }, [urlValue]);

  useEffect(() => {
    if (debouncedSearch === urlValue) return;
    void setParams({
      q: debouncedSearch || null,
      page: null,
    });
  }, [debouncedSearch, urlValue, setParams]);

  const onSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  /** Immediate local + URL update (clear filters / programmatic reset). */
  const setSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      void setParams({
        q: value || null,
        page: null,
      });
    },
    [setParams],
  );

  return {
    search,
    debouncedSearch,
    onSearchChange,
    setSearch,
  };
}

/** String enum filter in the URL; clears page so the filter applies to the full list. */
export function useAdminEnumParam<T extends string>(
  key: string,
  values: readonly [T, ...T[]],
  defaultValue: T,
) {
  const parsers = {
    [key]: parseAsStringEnum([...values]).withDefault(defaultValue),
    page: parseAsInteger,
  };

  const [state, setState] = useQueryStates(parsers, NUQS_OPTIONS);
  const value = state[key] as T;

  const setFilter = useCallback(
    (next: T) => {
      void setState({
        [key]: next === defaultValue ? null : next,
        page: null,
      } as Partial<typeof state>);
    },
    [defaultValue, key, setState],
  );

  return [value, setFilter] as const;
}

/** Free-form string filter; clears page so the filter applies to the full list. */
export function useAdminStringParam(key: string) {
  const [state, setState] = useQueryStates(
    {
      [key]: parseAsString.withDefault(''),
      page: parseAsInteger,
    },
    NUQS_OPTIONS,
  );
  const value = (state[key] as string) ?? '';

  const setFilter = useCallback(
    (next: string) => {
      void setState({
        [key]: next || null,
        page: null,
      } as Partial<typeof state>);
    },
    [key, setState],
  );

  return [value, setFilter] as const;
}

/**
 * Category + product (or similar paired filters) in one URL write to avoid races
 * when changing one must clear the other.
 */
export function useAdminCategoryProductParams() {
  const [{ category, product }, setParams] = useQueryStates(
    {
      category: parseAsString.withDefault(''),
      product: parseAsString.withDefault(''),
      page: parseAsInteger,
    },
    NUQS_OPTIONS,
  );

  const setCategory = useCallback(
    (next: string) => {
      void setParams({
        category: next || null,
        product: null,
        page: null,
      });
    },
    [setParams],
  );

  const setProduct = useCallback(
    (next: string) => {
      void setParams({
        product: next || null,
        page: null,
      });
    },
    [setParams],
  );

  const clearCategoryProduct = useCallback(() => {
    void setParams({ category: null, product: null, page: null });
  }, [setParams]);

  return {
    categoryFilter: category ?? '',
    productFilter: product ?? '',
    setCategory,
    setProduct,
    clearCategoryProduct,
  };
}

/** Date range synced to `startDate` / `endDate` (YYYY-MM-DD); clears page on change. */
export function useAdminDateRangeParam() {
  const [{ startDate, endDate }, setParams] = useQueryStates(
    {
      startDate: parseAsString,
      endDate: parseAsString,
      page: parseAsInteger,
    },
    NUQS_OPTIONS,
  );

  const dateRange = useMemo<DateRange | undefined>(() => {
    if (!startDate && !endDate) return undefined;
    return {
      from: startDate ? parseISO(startDate) : undefined,
      to: endDate ? parseISO(endDate) : undefined,
    };
  }, [startDate, endDate]);

  const onDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      if (!range?.from) {
        void setParams({ startDate: null, endDate: null, page: null });
        return;
      }
      void setParams({
        startDate: format(range.from, 'yyyy-MM-dd'),
        // Only set end when the user actually picked an end date (don't force end = start)
        endDate: range.to ? format(range.to, 'yyyy-MM-dd') : null,
        page: null,
      });
    },
    [setParams],
  );

  const dateParams = useMemo(
    () => ({
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }),
    [startDate, endDate],
  );

  const hasDateRange = Boolean(startDate || endDate);

  const clearDateRange = useCallback(() => {
    void setParams({ startDate: null, endDate: null, page: null });
  }, [setParams]);

  return { dateRange, onDateRangeChange, dateParams, hasDateRange, clearDateRange };
}
