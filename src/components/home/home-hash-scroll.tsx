'use client';

import { useEffect } from 'react';

/** Scroll to homepage hash targets (e.g. New Arrivals) after client navigation. */
export function HomeHashScroll() {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;

      let tries = 0;
      const attempt = () => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        // Section may still be streaming in via Suspense
        if (tries < 60) {
          tries += 1;
          window.requestAnimationFrame(attempt);
        }
      };
      attempt();
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  return null;
}
