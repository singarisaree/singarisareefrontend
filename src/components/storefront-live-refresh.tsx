'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { refreshStorefrontCacheFromRealtime } from '@/actions/revalidate-storefront';
import { getRealtimeSocket } from '@/lib/socket-client';
import { REALTIME_EVENTS } from '@/lib/realtime-events';

const FOCUS_REFRESH_INTERVAL_MS = 8_000;

/**
 * Soft-refreshes storefront when:
 * - shopper returns to the tab, or
 * - admin changes products/stock/categories/banners/settings (catalog:changed socket).
 */
export function StorefrontLiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastFocusRefreshAt = useRef(0);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    const refreshFromFocus = () => {
      const now = Date.now();
      if (now - lastFocusRefreshAt.current < FOCUS_REFRESH_INTERVAL_MS) return;
      lastFocusRefreshAt.current = now;
      router.refresh();
      void queryClient.invalidateQueries();
    };

    const refreshFromRealtime = () => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      void (async () => {
        try {
          await refreshStorefrontCacheFromRealtime();
          router.refresh();
          await queryClient.invalidateQueries();
        } finally {
          refreshInFlight.current = false;
        }
      })();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFromFocus();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshFromFocus);
    window.addEventListener('pageshow', refreshFromFocus);

    const socket = getRealtimeSocket();
    socket?.on(REALTIME_EVENTS.CATALOG_CHANGED, refreshFromRealtime);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshFromFocus);
      window.removeEventListener('pageshow', refreshFromFocus);
      socket?.off(REALTIME_EVENTS.CATALOG_CHANGED, refreshFromRealtime);
    };
  }, [router, queryClient, pathname]);

  return null;
}
