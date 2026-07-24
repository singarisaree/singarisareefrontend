'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, Loader2, ShoppingBag, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatShortOrderNumber, formatTime } from '@/lib/utils';
import type { OrderPaymentStatus } from '@/lib/order-payment-status';

export function formatEstimatedDeliveryMessage(order: OrderPaymentStatus): string {
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

function BrandMark() {
  return (
    <p className="text-center text-[0.7rem] font-semibold tracking-[0.35em] text-maroon">
      SINGARI SAREES
    </p>
  );
}

function OrderNumberBlock({
  orderNumber,
  orderId,
}: {
  orderNumber?: string;
  orderId: string;
}) {
  return (
    <div className="mt-8 border-t border-gold/15 pt-6 text-left">
      <p className="text-xs uppercase tracking-[0.18em] text-brown-light">Order number</p>
      <p className="mt-1.5 font-serif text-xl text-charcoal">
        {formatShortOrderNumber(orderNumber || orderId)}
      </p>
    </div>
  );
}

export function OrderPaymentFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-cream pattern-mandala">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream/40 via-transparent to-cream/80" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md text-center"
        >
          <BrandMark />
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

export function OrderPaymentLoading({
  title = 'Confirming your payment',
  subtitle = 'Please wait — do not refresh this page.',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <OrderPaymentFrame>
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" aria-hidden />
      <h1 className="mt-6 font-serif text-2xl text-charcoal sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-brown-light">{subtitle}</p>
    </OrderPaymentFrame>
  );
}

export function OrderPaymentMissing() {
  return (
    <OrderPaymentFrame>
      <h1 className="font-serif text-2xl text-charcoal sm:text-3xl">Order not found</h1>
      <p className="mt-2 text-sm text-brown-light">
        We could not find this order. You can continue shopping or check My Orders.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/">
          <Button variant="gold" className="w-full sm:w-auto">
            Return home
          </Button>
        </Link>
        <Link href="/my-orders">
          <Button variant="outline" className="w-full sm:w-auto">
            My orders
          </Button>
        </Link>
      </div>
    </OrderPaymentFrame>
  );
}

export function OrderPaymentSuccessView({
  orderId,
  order,
}: {
  orderId: string;
  order: OrderPaymentStatus;
}) {
  return (
    <OrderPaymentFrame>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
      >
        <CheckCircle2 className="h-9 w-9" strokeWidth={1.5} aria-hidden />
      </motion.div>
      <h1 className="mt-6 font-serif text-3xl text-charcoal">Payment successful</h1>
      <p className="mt-2 text-brown-light">Thank you — your order is confirmed.</p>
      <OrderNumberBlock orderNumber={order.orderNumber} orderId={orderId} />
      <p className="mt-4 text-left text-sm text-brown-light">
        {formatEstimatedDeliveryMessage(order)}
      </p>
      <p className="mt-2 text-left text-sm text-brown-light">
        A confirmation will be sent on WhatsApp.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/my-orders">
          <Button variant="gold" className="w-full sm:w-auto">
            View my orders
          </Button>
        </Link>
        <Link href="/collections">
          <Button variant="outline" className="w-full sm:w-auto">
            <ShoppingBag className="h-4 w-4" aria-hidden />
            Continue shopping
          </Button>
        </Link>
      </div>
    </OrderPaymentFrame>
  );
}

export function OrderPaymentFailedView({
  orderId,
  order,
}: {
  orderId: string;
  order?: OrderPaymentStatus;
}) {
  return (
    <OrderPaymentFrame>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <XCircle className="h-9 w-9" strokeWidth={1.5} aria-hidden />
      </div>
      <h1 className="mt-6 font-serif text-3xl text-charcoal">Payment failed</h1>
      <p className="mt-2 text-brown-light">
        No amount was charged. You can try again from checkout.
      </p>
      <p className="mt-1 text-sm text-brown-light">
        If any amount was debited, it will be refunded in 3–7 working days.
      </p>
      {order ? <OrderNumberBlock orderNumber={order.orderNumber} orderId={orderId} /> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/checkout">
          <Button variant="gold" className="w-full sm:w-auto">
            Try again
          </Button>
        </Link>
        <Link href="/collections">
          <Button variant="outline" className="w-full sm:w-auto">
            Continue shopping
          </Button>
        </Link>
      </div>
    </OrderPaymentFrame>
  );
}

export function OrderPaymentPendingView({
  orderId,
  order,
}: {
  orderId: string;
  order?: OrderPaymentStatus;
}) {
  return (
    <OrderPaymentFrame>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Clock3 className="h-9 w-9" strokeWidth={1.5} aria-hidden />
      </div>
      <h1 className="mt-6 font-serif text-3xl text-charcoal">Payment pending</h1>
      <p className="mt-2 text-brown-light">
        We are confirming your payment with the bank. This usually takes a few seconds.
      </p>
      <Loader2 className="mx-auto mt-6 h-7 w-7 animate-spin text-gold" aria-hidden />
      {order ? <OrderNumberBlock orderNumber={order.orderNumber} orderId={orderId} /> : null}
      <p className="mt-6 text-sm text-brown-light">
        This page updates automatically. You can also check status in My Orders.
      </p>
      <div className="mt-6">
        <Link href="/my-orders">
          <Button variant="outline">Go to my orders</Button>
        </Link>
      </div>
    </OrderPaymentFrame>
  );
}
