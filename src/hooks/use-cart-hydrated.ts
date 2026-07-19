'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart-store';

/** True after cart state has been restored from localStorage (avoids empty-cart flash on refresh). */
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useCartStore.persist.hasHydrated());
    return unsub;
  }, []);

  return hydrated;
}
