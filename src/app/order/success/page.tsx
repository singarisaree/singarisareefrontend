'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Loader2, ShoppingBag, XCircle } from 'lucide-react';
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
      return `Estimated delivery: arrives by ${formatTime(arriveAt)} (Instant)`;
    }
    return 'Estimated delivery: arrives today (Instant)';
  }

  if (type === 'INTERNATIONAL') {
    return hasEta
      ? `Estimated delivery: expected by ${formatDate(eta)}`
      : 'Estimated delivery: timeline confirmed after shipping';
  }

  if (order.isHyderabadDelivery) {
    return 'Estimated delivery: arrives in 2 days';
  }

  return 'Estimated delivery: expected in 3–7 days';
}

function OrderSummaryCard({ orderData, orderId }: { orderData: OrderPaymentStatus; orderId: string }) {
  return (
    <div className="luxury-card mt-8 p-6 text-left">
      <p className="text-sm text-brown-light">Order number</p>
      <p className="text-base font-normal text-charcoal">
        {formatShortOrderNumber(orderData.orderNumber || orderId)}
      </p>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const clearCart = useCartStore((s) => s.clearCart);

  const { data: orderData, isLoading } = useQuery(orderPaymentReturnQueryOptions(orderId));

  const isConfirmed = !!orderData && isOrderPaymentSuccess(orderData);
  const isFailed = !!orderData && isOrderPaymentFailed(orderData);
  const isPending = !!orderData && isOrderPaymentPending(orderData);

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
          <Button variant="outline">Return home</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !orderData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
        <p className="mt-4 font-medium text-charcoal">Confirming your payment</p>
        <p className="mt-2 text-sm text-brown-light">Please wait — do not refresh this page.</p>
      </div>
    );
  }

  if (isConfirmed) {
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
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h1 className="font-serif text-3xl text-charcoal">Thank you!</h1>
          <p className="mt-2 text-brown-light">Your order is confirmed.</p>

          <div className="luxury-card mt-8 p-6 text-left">
            <p className="text-sm text-brown-light">Order number</p>
            <p className="text-base font-normal text-charcoal">
              {formatShortOrderNumber(orderData.orderNumber || orderId)}
            </p>
            <p className="mt-4 text-sm text-brown-light">
              {formatEstimatedDeliveryMessage(orderData)}
            </p>
            <p className="mt-2 text-sm text-brown-light">
              A confirmation message will be sent on WhatsApp.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/my-orders">
              <Button variant="gold">View my orders</Button>
            </Link>
            <Link href="/collections">
              <Button variant="outline">
                <ShoppingBag className="h-4 w-4" />
                Continue shopping
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <XCircle className="mx-auto h-16 w-16 text-red-500" />
        <h1 className="mt-6 font-serif text-3xl text-charcoal">Payment not completed</h1>
        <p className="mt-2 text-brown-light">
          No amount was charged. You can place a new order whenever you are ready.
        </p>
        <p className="mt-1 text-sm text-brown-light">
          If any amount was debited, it will be refunded in 3–7 working days.
        </p>

        <OrderSummaryCard orderData={orderData} orderId={orderId} />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/checkout">
            <Button variant="gold">Place a new order</Button>
          </Link>
          <Link href="/collections">
            <Button variant="outline">
              <ShoppingBag className="h-4 w-4" />
              Continue shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <Clock className="mx-auto h-16 w-16 text-amber-500" />
        <h1 className="mt-6 font-serif text-3xl text-charcoal">Confirming your payment</h1>
        <p className="mt-2 text-brown-light">
          We are verifying your payment with the bank. This usually takes a few seconds.
        </p>
        <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-gold" />

        <OrderSummaryCard orderData={orderData} orderId={orderId} />

        <p className="mt-6 text-sm text-brown-light">
          This page updates automatically. You can also check status in My Orders.
        </p>
        <div className="mt-6">
          <Link href="/my-orders">
            <Button variant="outline">Go to my orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

export default function OrderSuccessPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
            <p className="mt-4 text-brown-light">Loading order…</p>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
      <Footer />
    </>
  );
}
