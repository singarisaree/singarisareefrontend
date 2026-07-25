'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cart-store';
import {
  isOrderPaymentFailed,
  isOrderPaymentSuccess,
  orderPaymentReturnQueryOptions,
  type OrderPaymentStatus,
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
  const alreadyVerified = searchParams.get('verified') === '1';
  const clearCart = useCartStore((s) => s.clearCart);
  const pendingSinceRef = useRef<number | null>(null);
  const clearedRef = useRef(false);

  const { data: orderData, isLoading } = useQuery(orderPaymentReturnQueryOptions(orderId));

  useEffect(() => {
    if (!orderId) return;
    const paid = alreadyVerified || (orderData && isOrderPaymentSuccess(orderData));
    if (paid && !clearedRef.current) {
      clearedRef.current = true;
      clearCart();
      pendingSinceRef.current = null;
      return;
    }
    if (!orderData) return;
    if (isOrderPaymentFailed(orderData)) {
      if (alreadyVerified) return;
      router.replace(orderPaymentResultHref(orderId, 'failed'));
      return;
    }
    if (alreadyVerified || isOrderPaymentSuccess(orderData)) return;
    if (pendingSinceRef.current == null) pendingSinceRef.current = Date.now();
    if (Date.now() - pendingSinceRef.current >= PENDING_GRACE_MS) {
      router.replace(orderPaymentResultHref(orderId, 'pending'));
    }
  }, [orderData, orderId, clearCart, router, alreadyVerified]);

  if (!orderId) return <OrderPaymentMissing />;

  const optimisticOrder: OrderPaymentStatus = {
    status: 'PLACED',
    paymentStatus: 'SUCCESS',
    orderNumber: orderId,
  };

  // Checkout already verified with Razorpay — show success immediately (no second "Confirming" wait).
  if (alreadyVerified || (orderData && isOrderPaymentSuccess(orderData))) {
    return (
      <OrderPaymentSuccessView
        orderId={orderId}
        order={orderData && isOrderPaymentSuccess(orderData) ? orderData : optimisticOrder}
      />
    );
  }

  if (isLoading || !orderData) {
    return <OrderPaymentLoading title="Loading your order" />;
  }

  return <OrderPaymentLoading title="Confirming your payment" />;
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderPaymentLoading title="Loading your order" />}>
      <SuccessContent />
    </Suspense>
  );
}
