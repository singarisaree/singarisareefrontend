'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cart-store';
import {
  isOrderPaymentFailed,
  isOrderPaymentSuccess,
  orderPaymentReturnQueryOptions,
} from '@/lib/order-payment-status';
import { orderPaymentResultHref } from '@/lib/order-payment-routes';
import {
  OrderPaymentLoading,
  OrderPaymentMissing,
  OrderPaymentSuccessView,
} from '@/components/orders/order-payment-result';

/** Stay on success and poll briefly while verify catches up; then fall back to pending. */
const PENDING_GRACE_MS = 12_000;

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const clearCart = useCartStore((s) => s.clearCart);
  const pendingSinceRef = useRef<number | null>(null);

  const { data: orderData, isLoading } = useQuery(orderPaymentReturnQueryOptions(orderId));

  useEffect(() => {
    if (!orderData || !orderId) return;
    if (isOrderPaymentSuccess(orderData)) {
      clearCart();
      pendingSinceRef.current = null;
      return;
    }
    if (isOrderPaymentFailed(orderData)) {
      router.replace(orderPaymentResultHref(orderId, 'failed'));
      return;
    }
    // Still confirming — keep polling on this page for a short grace period.
    if (pendingSinceRef.current == null) pendingSinceRef.current = Date.now();
    if (Date.now() - pendingSinceRef.current >= PENDING_GRACE_MS) {
      router.replace(orderPaymentResultHref(orderId, 'pending'));
    }
  }, [orderData, orderId, clearCart, router]);

  if (!orderId) return <OrderPaymentMissing />;
  if (isLoading || !orderData) return <OrderPaymentLoading />;
  if (!isOrderPaymentSuccess(orderData)) {
    return <OrderPaymentLoading title="Confirming your payment" />;
  }
  return <OrderPaymentSuccessView orderId={orderId} order={orderData} />;
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderPaymentLoading />}>
      <SuccessContent />
    </Suspense>
  );
}
