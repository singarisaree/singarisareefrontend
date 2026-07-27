'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Loader2, ShoppingBag, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatShortOrderNumber } from '@/lib/utils';
import {
  formatEstimatedDeliveryMessage,
} from '@/components/orders/order-payment-result';
import { DeliveryTypeBadge } from '@/components/orders/delivery-type-badge';
import {
  isOrderPaymentFailed,
  isOrderPaymentSuccess,
  orderPaymentReturnQueryOptions,
  type OrderPaymentStatus,
} from '@/lib/order-payment-status';
import { formatPaymentFailureMessage, PAYMENT_PENDING_MESSAGE } from '@/lib/payment-failure-message';
import type { PaymentResultOutcome } from '@/lib/order-payment-routes';

export type OrderPaymentDialogState = {
  orderId: string;
  outcome: PaymentResultOutcome;
  verified?: boolean;
  reason?: string;
};

type OrderPaymentResultDialogProps = {
  state: OrderPaymentDialogState | null;
  onOpenChange: (open: boolean) => void;
  onOutcomeChange?: (outcome: PaymentResultOutcome) => void;
  /** When set, closing via X after success goes here instead of leaving empty checkout. */
  onDismissSuccess?: () => void;
};

export function OrderPaymentResultDialog({
  state,
  onOpenChange,
  onOutcomeChange,
  onDismissSuccess,
}: OrderPaymentResultDialogProps) {
  const open = Boolean(state);
  const orderId = state?.orderId ?? null;
  const outcome = state?.outcome ?? 'pending';
  const verified = state?.verified === true;

  const go = (path: string) => {
    // Hard navigation avoids races with dialog close / empty-cart redirects.
    window.location.assign(path);
  };

  const { data: orderData } = useQuery({
    ...orderPaymentReturnQueryOptions(orderId),
    enabled: open && Boolean(orderId),
  });

  useEffect(() => {
    if (!open || !orderData || !onOutcomeChange) return;
    if (isOrderPaymentSuccess(orderData) && outcome !== 'success') {
      onOutcomeChange('success');
      return;
    }
    if (isOrderPaymentFailed(orderData) && outcome !== 'failed' && !verified) {
      onOutcomeChange('failed');
    }
  }, [open, orderData, outcome, onOutcomeChange, verified]);

  const optimistic: OrderPaymentStatus = {
    status: 'PLACED',
    paymentStatus: 'SUCCESS',
    orderNumber: orderId || '',
  };

  const order =
    orderData && (isOrderPaymentSuccess(orderData) || outcome === 'pending')
      ? orderData
      : outcome === 'success'
        ? optimistic
        : orderData;

  const orderDetailsPath = orderId
    ? `/my-orders?order=${encodeURIComponent(orderId)}`
    : '/my-orders';

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && outcome === 'success' && onDismissSuccess) {
          onDismissSuccess();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        overlayClassName="!bg-charcoal/30 !backdrop-blur-xl data-[state=open]:duration-0"
        className="flex !h-auto max-h-[80vh] !w-[80vw] !max-w-[80vw] flex-col overflow-y-auto border-beige bg-cream p-5 duration-0 data-[state=open]:zoom-in-100 sm:rounded-2xl sm:p-6"
      >
        {outcome === 'success' ? (
          <>
            <DialogHeader className="items-center text-center sm:items-center sm:text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} aria-hidden />
              </div>
              <DialogTitle className="font-serif text-2xl text-charcoal">
                Payment successful
              </DialogTitle>
              <DialogDescription className="text-brown-light">
                Thank you — your order is placed.
              </DialogDescription>
            </DialogHeader>
            {orderId ? (
              <div className="border-t border-gold/15 pt-4 text-left">
                <p className="text-xs uppercase tracking-[0.18em] text-brown-light">
                  Order number
                </p>
                <p className="mt-1.5 font-sans text-base font-normal tracking-normal text-charcoal">
                  {formatShortOrderNumber(order?.orderNumber || orderId)}
                </p>
                {order ? (
                  <div className="mt-3 space-y-2">
                    <DeliveryTypeBadge
                      address={order.shippingAddress ?? undefined}
                      type={order.deliveryType}
                      size="md"
                      className="normal-case"
                    />
                    <p className="text-sm text-brown-light">
                      {formatEstimatedDeliveryMessage(order)}
                    </p>
                  </div>
                ) : null}
                <p className="mt-2 text-sm text-brown-light">
                  Order details will be sent on WhatsApp.
                </p>
              </div>
            ) : null}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="gold"
                className="flex-1"
                onClick={() => go(orderDetailsPath)}
              >
                View order details
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => go('/collections')}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden />
                Continue shopping
              </Button>
            </div>
          </>
        ) : null}

        {outcome === 'failed' ? (
          <>
            <DialogHeader className="items-center text-center sm:items-center sm:text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                <XCircle className="h-8 w-8" strokeWidth={1.5} aria-hidden />
              </div>
              <DialogTitle className="font-serif text-2xl text-charcoal">Payment failed</DialogTitle>
              <DialogDescription className="text-brown-light">
                {formatPaymentFailureMessage(state?.reason)}
              </DialogDescription>
            </DialogHeader>
            {orderId ? (
              <div className="border-t border-gold/15 pt-4 text-left">
                <p className="text-xs uppercase tracking-[0.18em] text-brown-light">
                  Order number
                </p>
                <p className="mt-1.5 font-sans text-base font-normal tracking-normal text-charcoal">
                  {formatShortOrderNumber(orderId)}
                </p>
              </div>
            ) : null}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="gold" className="flex-1" onClick={() => onOpenChange(false)}>
                Try again
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => go('/collections')}
              >
                Continue shopping
              </Button>
            </div>
          </>
        ) : null}

        {outcome === 'pending' ? (
          <>
            <DialogHeader className="items-center text-center sm:items-center sm:text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Clock3 className="h-8 w-8" strokeWidth={1.5} aria-hidden />
              </div>
              <DialogTitle className="font-serif text-2xl text-charcoal">
                Transaction pending
              </DialogTitle>
              <DialogDescription className="text-brown-light">
                {PAYMENT_PENDING_MESSAGE}
              </DialogDescription>
            </DialogHeader>
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-gold" aria-hidden />
            {orderId ? (
              <div className="border-t border-gold/15 pt-4 text-left">
                <p className="text-xs uppercase tracking-[0.18em] text-brown-light">
                  Order number
                </p>
                <p className="mt-1.5 font-sans text-base font-normal tracking-normal text-charcoal">
                  {formatShortOrderNumber(orderId)}
                </p>
              </div>
            ) : null}
            <p className="text-center text-xs text-brown-light">
              This updates automatically. You can also check My Orders.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => go(orderDetailsPath)}
            >
              View order details
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
