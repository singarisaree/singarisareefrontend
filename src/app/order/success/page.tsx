'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { useCartStore } from '@/stores/cart-store';
import { formatDate, formatTime, formatShortOrderNumber } from '@/lib/utils';
import {
  isOrderPaymentFailed,
  isOrderPaymentPending,
  isOrderPaymentSuccess,
  orderPaymentReturnQueryOptions,
  type OrderPaymentStatus,
} from '@/lib/order-payment-status';

function formatEstimatedDeliveryMessage(order: OrderPaymentStatus): string {
  const type = order.deliveryType || 'INDIA';
  const eta = order.estimatedDelivery ? new Date(order.estimatedDelivery) : null;
  const hasEta = eta != null && Number.isFinite(eta.getTime());

  if (type === 'QUICK') {
    if (hasEta) {
      const looksLikeDateOnly =
        eta.getHours() === 0 && eta.getMinutes() === 0 && eta.getSeconds() === 0;
      const arriveAt = looksLikeDateOnly
        ? new Date(Date.now() + 60 * 60 * 1000)
        : eta;
      return `Estimated Delivery: Arrives by ${formatTime(arriveAt)} (Instant)`;
    }
    return 'Estimated Delivery: Arrives today (Instant)';
  }

  if (type === 'INTERNATIONAL') {
    return hasEta
      ? `Estimated Delivery: Expected by ${formatDate(eta)}`
      : 'Estimated Delivery: Timeline confirmed after shipping calculation';
  }

  // Hyderabad Standard: always 2 days
  if (order.isHyderabadDelivery) {
    return 'Estimated Delivery: Arrives in 2 days';
  }

  // Other India cities: 3–7 day window (not Instant / not Hyderabad)
  return 'Estimated Delivery: Expected in 3–7 days';
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const clearCart = useCartStore((s) => s.clearCart);

  const { data: orderData, isLoading } = useQuery(orderPaymentReturnQueryOptions(orderId));
  const isConfirmed = !!orderData && isOrderPaymentSuccess(orderData);
  const pendingChecks = useRef(0);

  useEffect(() => {
    if (!orderData || !orderId) return;
    if (isOrderPaymentFailed(orderData)) {
      router.replace(`/order/failed?order_id=${orderId}`);
      return;
    }
    if (isOrderPaymentPending(orderData)) {
      pendingChecks.current += 1;
      // Keep checking briefly, then move to pending page if still unresolved.
      if (pendingChecks.current >= 20) {
        router.replace(`/order/pending?order_id=${orderId}`);
      }
    }
  }, [orderData, orderId, router]);

  useEffect(() => {
    if (orderData && isOrderPaymentSuccess(orderData)) {
      clearCart();
    }
  }, [orderData, clearCart]);

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

  // Don't show thank-you until payment is confirmed — avoids false success on failed payments.
  if (isLoading || !orderData || !isConfirmed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
        <p className="mt-4 text-brown-light">Confirming your payment...</p>
        <p className="mt-2 text-sm text-brown-light">
          Order {formatShortOrderNumber(orderData?.orderNumber || orderId)}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
      >
        <CheckCircle className="mx-auto h-16 w-16 text-gold" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <h1 className="font-serif text-3xl text-charcoal">Thank You!</h1>
        <p className="mt-2 text-brown-light">Your order has been placed successfully</p>

        <div className="luxury-card mt-8 p-6 text-left">
          <p className="text-sm text-brown-light">Order Number</p>
          <p className="text-base font-normal text-charcoal">
            {formatShortOrderNumber(orderData.orderNumber || orderId)}
          </p>
          <p className="mt-4 text-sm text-brown-light">
            {formatEstimatedDeliveryMessage(orderData)}
          </p>
          <p className="mt-2 text-sm text-brown-light">
            A confirmation WhatsApp message has been sent to you.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/collections">
            <Button variant="gold">
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
          <Link href="/my-orders">
            <Button variant="outline">My Orders</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <>
      <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
        <SuccessContent />
      </Suspense>
      <Footer />
    </>
  );
}
