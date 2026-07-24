'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  isOrderPaymentFailed,
  isOrderPaymentPending,
  isOrderPaymentSuccess,
  orderPaymentReturnQueryOptions,
} from '@/lib/order-payment-status';
import { orderPaymentResultHref } from '@/lib/order-payment-routes';
import {
  OrderPaymentLoading,
  OrderPaymentMissing,
  OrderPaymentPendingView,
} from '@/components/orders/order-payment-result';

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const { data: orderData, isLoading } = useQuery(orderPaymentReturnQueryOptions(orderId));

  useEffect(() => {
    if (!orderData || !orderId) return;
    if (isOrderPaymentSuccess(orderData)) {
      router.replace(orderPaymentResultHref(orderId, 'success'));
      return;
    }
    if (isOrderPaymentFailed(orderData)) {
      router.replace(orderPaymentResultHref(orderId, 'failed'));
    }
  }, [orderData, orderId, router]);

  if (!orderId) return <OrderPaymentMissing />;
  if (isLoading || !orderData) return <OrderPaymentLoading />;
  if (!isOrderPaymentPending(orderData)) {
    return <OrderPaymentLoading title="Updating payment status" />;
  }
  return <OrderPaymentPendingView orderId={orderId} order={orderData} />;
}

export default function OrderPendingPage() {
  return (
    <Suspense fallback={<OrderPaymentLoading />}>
      <PendingContent />
    </Suspense>
  );
}
