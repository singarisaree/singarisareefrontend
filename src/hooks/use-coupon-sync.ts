'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';
import { formatCouponErrorMessage } from '@/lib/coupon-messages';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useCartStore } from '@/stores/cart-store';
import { orderService } from '@/services/store.service';

const COUPON_DEBOUNCE_MS = 500;

/** Re-validates applied coupon when cart subtotal, shipping, or items change */
export function useCouponSync(phone?: string, shippingCharge = 0) {
  const itemCount = useCartStore((s) => s.items.length);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const subtotal = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  const debouncedSubtotal = useDebouncedValue(subtotal, COUPON_DEBOUNCE_MS);
  const debouncedPhone = useDebouncedValue(phone?.trim() || '', COUPON_DEBOUNCE_MS);
  const debouncedShipping = useDebouncedValue(shippingCharge, COUPON_DEBOUNCE_MS);
  const hadCoupon = useRef(false);

  useEffect(() => {
    if (couponCode) {
      hadCoupon.current = true;
    }
  }, [couponCode]);

  useEffect(() => {
    if (!couponCode) return;

    if (itemCount === 0) {
      setCoupon(null, 0);
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        const result = await orderService.validateCoupon(
          couponCode,
          debouncedSubtotal,
          debouncedPhone || undefined,
          debouncedShipping,
        );
        if (cancelled) return;

        const { couponDiscount, isRefundCoupon } = useCartStore.getState();
        const nextIsRefund = Boolean(result.isRefundCoupon ?? result.coupon?.isRefundCoupon);
        if (result.discount !== couponDiscount || nextIsRefund !== isRefundCoupon) {
          setCoupon(couponCode, result.discount, nextIsRefund);
        }
      } catch (error) {
        if (cancelled) return;
        const code = couponCode;
        setCoupon(null, 0);
        if (hadCoupon.current) {
          toast.error(
            formatCouponErrorMessage(error, { couponCode: code, removed: true }),
          );
          hadCoupon.current = false;
        }
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [
    couponCode,
    debouncedSubtotal,
    debouncedPhone,
    debouncedShipping,
    itemCount,
    setCoupon,
  ]);
}

export async function validateCouponForCheckout(
  couponCode: string | null,
  subtotal: number,
  phone?: string,
  shippingCharge = 0,
): Promise<{ code: string; discount: number; isRefundCoupon: boolean } | null> {
  if (!couponCode) return null;

  try {
    const result = await orderService.validateCoupon(
      couponCode,
      subtotal,
      phone,
      shippingCharge,
    );
    return {
      code: couponCode,
      discount: result.discount,
      isRefundCoupon: Boolean(result.isRefundCoupon ?? result.coupon?.isRefundCoupon),
    };
  } catch (error) {
    throw new Error(
      formatCouponErrorMessage(error, { couponCode, removed: true }),
    );
  }
}
