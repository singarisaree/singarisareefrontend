'use client';

import { useEffect, useRef } from 'react';

/** Reset to page 1 when filters change, but not on the initial mount. */
export function useResetPageOnFilterChange(resetPage: () => void, ...deps: unknown[]) {
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
