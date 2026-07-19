'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';
import { useCartStore } from '@/stores/cart-store';
import { orderService } from '@/services/store.service';

const SYNC_DEBOUNCE_MS = 400;

export function useCartSync() {
  const syncFromServer = useCartStore((s) => s.syncFromServer);
  const itemKey = useCartStore((s) =>
    s.items.map((i) => `${i.productColorId}:${i.quantity}`).join(','),
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const snapshot = useCartStore.getState().items;
    if (snapshot.length === 0) return;

    let cancelled = false;

    const runSync = async () => {
      const current = useCartStore.getState().items;
      if (current.length === 0) return;

      try {
        const result = await orderService.syncCart(
          current.map((item) => ({
            productId: item.productId,
            productColorId: item.productColorId,
            quantity: item.quantity,
          })),
        );

        if (cancelled) return;

        syncFromServer(result.items);

        if (result.removed.length > 0) {
          result.removed.forEach((entry) => {
            toast.error(`${entry.productName}: ${entry.reason}`);
          });
        }

        if (result.adjusted.length > 0) {
          result.adjusted.forEach((entry) => {
            toast.info(`${entry.productName}: quantity updated to ${entry.to} (limited stock)`);
          });
        }

        const priceOrStockChanged =
          result.items.length > 0 &&
          current.some((item) => {
            const synced = result.items.find((s) => s.productColorId === item.productColorId);
            return synced && (synced.price !== item.price || synced.maxStock !== item.maxStock);
          });

        if (priceOrStockChanged && result.removed.length === 0 && result.adjusted.length === 0) {
          toast.info('Cart updated with latest prices and stock');
        }
      } catch {
        if (!cancelled) {
          toast.error('Could not refresh cart. Please reload the page.');
        }
      }
    };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSync();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [syncFromServer, itemKey]);
}
