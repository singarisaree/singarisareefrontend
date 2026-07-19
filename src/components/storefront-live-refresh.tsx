'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/socket-client';
import { REALTIME_EVENTS } from '@/lib/realtime-events';

const MIN_REFRESH_INTERVAL_MS = 8_000;

/**
 * Soft-refreshes storefront when:
 * - shopper returns to the tab, or
 * - admin changes products/stock/categories (catalog:changed socket).
 */
export function StorefrontLiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      if (now - lastRefreshAt.current < MIN_REFRESH_INTERVAL_MS) return;
      lastRefreshAt.current = now;
      router.refresh();
      void queryClient.invalidateQueries();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const onFocus = () => refresh();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);

    const socket = getRealtimeSocket();
    socket?.on(REALTIME_EVENTS.CATALOG_CHANGED, refresh);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onFocus);
      socket?.off(REALTIME_EVENTS.CATALOG_CHANGED, refresh);
    };
  }, [router, queryClient, pathname]);

  return null;
}
