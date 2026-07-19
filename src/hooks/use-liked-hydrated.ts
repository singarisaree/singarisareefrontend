'use client';

import { useEffect, useState } from 'react';
import { useLikedStore } from '@/stores/liked-store';

/** True after liked state has been restored from localStorage. */
export function useLikedHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useLikedStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useLikedStore.persist.hasHydrated());
    return unsub;
  }, []);

  return hydrated;
}
