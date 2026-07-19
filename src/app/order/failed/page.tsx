'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { XCircle, ShoppingBag, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { formatShortOrderNumber } from '@/lib/utils';
import {
  isOrderPaymentPending,
  isOrderPaymentSuccess,
  orderPaymentStatusQueryOptions,
} from '@/lib/order-payment-status';
import { orderService } from '@/services/store.service';
import { openRazorpayCheckout, preloadRazorpayScript } from '@/lib/razorpay-checkout';
import {
  PaymentStatusOverlay,
  type PaymentOverlayPhase,
} from '@/components/orders/payment-status-overlay';
import { toast } from '@/lib/toast';
import { useCartStore } from '@/stores/cart-store';

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const redirected = useRef(false);
  const clearCart = useCartStore((s) => s.clearCart);
  const [isRetrying, setIsRetrying] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentOverlayPhase>(null);

  const { data: orderData, isLoading } = useQuery(orderPaymentStatusQueryOptions(orderId));
  const canRetryOnSameOrder = !!orderData && isOrderPaymentPending(orderData);

  useEffect(() => {
    void preloadRazorpayScript();
  }, []);

  useEffect(() => {
    if (!orderId || !orderData || redirected.current) return;
    if (!isOrderPaymentSuccess(orderData)) return;
    redirected.current = true;
    clearCart();
    router.replace(`/order/success?order_id=${orderId}`);
  }, [orderData, orderId, router, clearCart]);

  const handleRetry = async () => {
    if (!orderId || isRetrying) return;

    if (!canRetryOnSameOrder) {
      router.push('/checkout');
      return;
    }

    setIsRetrying(true);
    setPaymentPhase('creating');
    try {
      const result = await orderService.retryPayment(orderId);
      setPaymentPhase('checkout');
      const payResult = await openRazorpayCheckout({
        keyId: result.keyId,
        razorpayOrderId: result.razorpayOrderId,
        amount: result.amount,
        currency: result.currency,
        orderNumber: orderId,
        onVerifying: () => setPaymentPhase('verifying'),
      });

      if (payResult.status === 'paid') {
        clearCart();
        setPaymentPhase('verifying');
        router.replace(`/order/success?order_id=${encodeURIComponent(orderId)}`);
        return;
      }

      setPaymentPhase(null);
      if (payResult.status === 'failed') {
        toast.error(payResult.reason || 'Payment was not completed. Please try again.');
      }
    } catch {
      setPaymentPhase(null);
      toast.error('Could not restart payment. Please try again from checkout.');
      router.push('/checkout');
    } finally {
      setIsRetrying(false);
    }
  };

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

  if (isLoading || (orderData && isOrderPaymentSuccess(orderData))) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center sm:px-6">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="mt-4 text-brown-light">Confirming payment status…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
      >
        <XCircle className="mx-auto h-16 w-16 text-red-500" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <h1 className="font-serif text-3xl text-charcoal">Payment not completed</h1>
        <p className="mt-2 text-brown-light">
          No worries — you can try again. If any amount was debited, it will be auto-refunded in 3–7
          working days.
        </p>

        <div className="luxury-card mt-8 p-6 text-left">
          <p className="text-sm text-brown-light">Order Number</p>
          <p className="text-base font-normal text-charcoal">{formatShortOrderNumber(orderId)}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="gold" onClick={() => void handleRetry()} disabled={isRetrying}>
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRetrying ? 'Opening payment…' : 'Try again'}
          </Button>
          <Link href="/collections">
            <Button variant="outline" disabled={isRetrying}>
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>
      </motion.div>
      <PaymentStatusOverlay phase={paymentPhase} />
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <>
      <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
        <FailedContent />
      </Suspense>
      <Footer />
    </>
  );
}
