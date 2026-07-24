'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { orderPaymentResultHref } from '@/lib/order-payment-routes';
import {
  OrderPaymentLoading,
  OrderPaymentMissing,
} from '@/components/orders/order-payment-result';

/** Legacy Razorpay return URL — forwards to pending confirmation. */
function ReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (!orderId) return;
    router.replace(orderPaymentResultHref(orderId, 'pending'));
  }, [orderId, router]);

  if (!orderId) return <OrderPaymentMissing />;
  return <OrderPaymentLoading />;
}

export default function OrderReturnPage() {
  return (
    <Suspense fallback={<OrderPaymentLoading />}>
      <ReturnContent />
    </Suspense>
  );
}
