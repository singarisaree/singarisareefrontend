'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const SHOW_DELAY_MS = 180;
const MIN_VISIBLE_MS = 240;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (!active) return;

    const shownAt = shownAtRef.current ?? Date.now();
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    hideTimerRef.current = window.setTimeout(() => {
      setActive(false);
      shownAtRef.current = null;
      hideTimerRef.current = null;
    }, remaining);
  }, [pathname, searchParams, active]);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!anchor || anchor.getAttribute('target') === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      try {
        const next = new URL(href, window.location.origin);
        const current = new URL(window.location.href);
        if (next.origin !== current.origin) return;
        if (next.pathname === current.pathname && next.search === current.search) return;

        if (showTimerRef.current) {
          window.clearTimeout(showTimerRef.current);
        }
        if (hideTimerRef.current) {
          window.clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }

        showTimerRef.current = window.setTimeout(() => {
          setActive(true);
          shownAtRef.current = Date.now();
          showTimerRef.current = null;
        }, SHOW_DELAY_MS);
      } catch {
        /* ignore malformed href */
      }
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-maroon/15"
      aria-hidden
    >
      <div className="h-full w-1/3 animate-[navigation-progress_0.8s_ease-in-out_infinite] bg-maroon" />
    </div>
  );
}
