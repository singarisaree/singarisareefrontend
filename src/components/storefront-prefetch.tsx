'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Core routes only — no client API fetch; slug prefetch handled per listing page. */
const WARM_ROUTES = ['/', '/collections', '/about', '/contact'];

export function StorefrontPrefetch() {
  const router = useRouter();
  const pathname = usePathname();
  const warmedRef = useRef(false);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    if (warmedRef.current) return;
    warmedRef.current = true;

    const warm = () => {
      WARM_ROUTES.forEach((href) => {
        if (href !== pathname) router.prefetch(href);
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(warm, { timeout: 3000 });
    } else {
      setTimeout(warm, 500);
    }
  }, [pathname, router]);

  return null;
}
