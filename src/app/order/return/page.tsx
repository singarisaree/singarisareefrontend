'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { formatShortOrderNumber } from '@/lib/utils';
import {
  isOrderPaymentFailed,
  isOrderPaymentPending,
  isOrderPaymentSuccess,
  orderPaymentReturnQueryOptions,
} from '@/lib/order-payment-status';

/**
 * Payment return landing page.
 * After Razorpay checkout completes or is abandoned, customers may land here.
 * We sync status, then send the customer to the right order page.
 */
function ReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const redirected = useRef(false);

  const { data: orderData, isLoading, isError } = useQuery(orderPaymentReturnQueryOptions(orderId));

  useEffect(() => {
    if (!orderId || !orderData || redirected.current) return;

    if (isOrderPaymentFailed(orderData)) {
      redirected.current = true;
      router.replace(`/order/failed?order_id=${orderId}`);
      return;
    }

    if (isOrderPaymentSuccess(orderData)) {
      redirected.current = true;
      router.replace(`/order/success?order_id=${orderId}`);
      return;
    }

    if (isOrderPaymentPending(orderData)) {
      // Keep polling briefly; after a few checks go to pending page.
    }
  }, [orderData, orderId, router]);

  useEffect(() => {
    if (!orderId || !orderData || redirected.current) return;
    if (!isOrderPaymentPending(orderData)) return;

    const timer = window.setTimeout(() => {
      if (redirected.current) return;
      redirected.current = true;
      router.replace(`/order/pending?order_id=${orderId}`);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [orderData, orderId, router]);

  if (!orderId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <p className="text-brown-light">Order not found.</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">Return Home</Button>
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <p className="text-brown-light">Could not confirm payment status.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/order/failed?order_id=${orderId}`}>
            <Button variant="gold">View order status</Button>
          </Link>
          <Link href="/checkout">
            <Button variant="outline">Try again</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
      <p className="mt-4 text-brown-light">
        {isLoading ? 'Returning from payment...' : 'Confirming payment status...'}
      </p>
      <p className="mt-2 text-sm text-brown-light">
        Order {formatShortOrderNumber(orderData?.orderNumber || orderId)}
      </p>
    </div>
  );
}

export default function OrderReturnPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
          </div>
        }
      >
        <ReturnContent />
      </Suspense>
      <Footer />
    </>
  );
}
