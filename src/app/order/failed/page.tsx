'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  isOrderPaymentFailed,
  isOrderPaymentSuccess,
  orderPaymentReturnQueryOptions,
} from '@/lib/order-payment-status';
import { orderPaymentResultHref } from '@/lib/order-payment-routes';
import {
  OrderPaymentFailedView,
  OrderPaymentLoading,
  OrderPaymentMissing,
} from '@/components/orders/order-payment-result';

const PENDING_GRACE_MS = 8_000;

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const pendingSinceRef = useRef<number | null>(null);
  const { data: orderData, isLoading } = useQuery(orderPaymentReturnQueryOptions(orderId));

  useEffect(() => {
    if (!orderData || !orderId) return;
    if (isOrderPaymentSuccess(orderData)) {
      router.replace(orderPaymentResultHref(orderId, 'success'));
      return;
    }
    if (isOrderPaymentFailed(orderData)) {
      pendingSinceRef.current = null;
      return;
    }
    // Failure report may still be in flight — poll briefly before pending page.
    if (pendingSinceRef.current == null) pendingSinceRef.current = Date.now();
    if (Date.now() - pendingSinceRef.current >= PENDING_GRACE_MS) {
      router.replace(orderPaymentResultHref(orderId, 'pending'));
    }
  }, [orderData, orderId, router]);

  if (!orderId) return <OrderPaymentMissing />;
  if (isLoading || !orderData) {
    return <OrderPaymentLoading title="Checking payment status" />;
  }
  if (!isOrderPaymentFailed(orderData)) {
    return <OrderPaymentLoading title="Updating payment status" />;
  }
  return <OrderPaymentFailedView orderId={orderId} order={orderData} />;
}

export default function OrderFailedPage() {
  return (
    <Suspense fallback={<OrderPaymentLoading />}>
      <FailedContent />
    </Suspense>
  );
}
