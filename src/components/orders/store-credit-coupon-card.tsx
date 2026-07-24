'use client';

import { useState } from 'react';
import { getRefundTrackingDetails } from '@/lib/order-return-tracking';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@/types';

export function StoreCreditCouponCard({ order }: { order: Order }) {
  const details = getRefundTrackingDetails(order);
  const [copied, setCopied] = useState(false);

  if (!details.couponCode) return null;

  const copyCouponCode = async () => {
    try {
      await navigator.clipboard.writeText(details.couponCode!);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
      <h3 className="text-sm font-medium text-charcoal">Store credit coupon</h3>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-brown-light">Coupon code</p>
            <p className="mt-0.5 font-mono text-base font-semibold tracking-wide text-charcoal">
              {details.couponCode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyCouponCode()}
            className="shrink-0 rounded-md border border-beige bg-white px-3 py-1.5 text-xs font-medium text-maroon hover:bg-beige/40"
          >
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
        {details.refundAmount != null && details.refundAmount > 0 && (
          <div className="flex items-center justify-between text-brown-light">
            <span>Coupon amount</span>
            <span className="font-medium text-charcoal">
              {formatPrice(details.refundAmount)}
            </span>
          </div>
        )}
        {details.deduction != null && details.deduction > 0 && (
          <div className="flex items-center justify-between text-brown-light">
            <span>Shipping deduction</span>
            <span className="font-medium text-charcoal">
              {formatPrice(details.deduction)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
