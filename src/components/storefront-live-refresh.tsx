'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { refreshStorefrontCacheFromRealtime } from '@/actions/revalidate-storefront';
import { getRealtimeSocket } from '@/lib/socket-client';
import { REALTIME_EVENTS } from '@/lib/realtime-events';

const FOCUS_REFRESH_INTERVAL_MS = 120_000;
/** Ignore focus/visibility right after load — those fire on refresh and cause a blank blink. */
const MOUNT_GRACE_MS = 4_000;

/**
 * Soft-refreshes storefront when:
 * - shopper returns to the tab (after grace period), or
 * - admin changes products/stock/categories/banners/settings (catalog:changed socket).
 *
 * Does NOT refresh on hard reload / first paint — that already has fresh HTML and
 * calling router.refresh() replaces the page with loading UI (blank blink).
 */
export function StorefrontLiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastFocusRefreshAt = useRef(0);
  const refreshInFlight = useRef(false);
  const mountedAt = useRef(0);

  useEffect(() => {
    mountedAt.current = Date.now();

    const withinMountGrace = () => Date.now() - mountedAt.current < MOUNT_GRACE_MS;

    const refreshFromFocus = () => {
      if (withinMountGrace()) return;
      const now = Date.now();
      if (now - lastFocusRefreshAt.current < FOCUS_REFRESH_INTERVAL_MS) return;
      lastFocusRefreshAt.current = now;
      router.refresh();
      void queryClient.invalidateQueries();
    };

    const refreshFromRealtime = () => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;

      // Update active client queries immediately when the socket event arrives.
      void queryClient.invalidateQueries();

      void (async () => {
        try {
          await refreshStorefrontCacheFromRealtime();
          router.refresh();
          // Re-fetch once more after Next.js server caches have been cleared.
          await queryClient.invalidateQueries();
        } finally {
          refreshInFlight.current = false;
        }
      })();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFromFocus();
    };

    // Only revalidate when restored from back/forward cache — not on normal load.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refreshFromFocus();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshFromFocus);
    window.addEventListener('pageshow', onPageShow);

    const socket = getRealtimeSocket();
    socket?.on(REALTIME_EVENTS.CATALOG_CHANGED, refreshFromRealtime);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshFromFocus);
      window.removeEventListener('pageshow', onPageShow);
      socket?.off(REALTIME_EVENTS.CATALOG_CHANGED, refreshFromRealtime);
    };
  }, [router, queryClient, pathname]);

  return null;
}
