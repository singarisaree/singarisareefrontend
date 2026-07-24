'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getOrderDeliveredAt, shouldShowRefundCreditNotice } from '@/lib/order-return';
import { RefundCreditNotice } from '@/components/orders/refund-credit-notice';
import {
  OrderPaymentStatusNotice,
  shouldHideOrderTracking,
} from '@/components/orders/order-payment-status-notice';
import {
  getEffectiveReturnTimeline,
  getRefundTrackingDetails,
  getReturnEntryLabel,
  getReturnFlowIndex,
  getReturnStepLabel,
} from '@/lib/order-return-tracking';
import { cn, formatDate, formatPrice, formatTime, getOrderStatusLabel } from '@/lib/utils';
import type { Order, ReturnRequest, ReturnRequestTrackingEntry } from '@/types';

const TRACKING_STEPS = [
  'PLACED',
  'CONFIRMED',
  'READY_TO_SHIP',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
] as const;

type TrackingOrder = Pick<
  Order,
  | 'status'
  | 'trackingHistory'
  | 'returnRequests'
  | 'refundAmount'
  | 'refundDeduction'
  | 'refundUtr'
  | 'refundedAt'
  | 'payments'
>;

type TimelineStep =
  | { kind: 'order'; step: string; timestamp?: string }
  | { kind: 'return'; entry: ReturnRequestTrackingEntry }
  | { kind: 'refund'; entry: ReturnRequestTrackingEntry };

function RefundTrackingBlock({
  order,
  isAdmin,
}: {
  order: TrackingOrder;
  isAdmin: boolean;
}) {
  const details = getRefundTrackingDetails(order);
  const textClass = isAdmin ? 'text-[#64748b]' : 'text-brown-light';
  const labelClass = isAdmin ? 'font-medium text-[#0f172a]' : 'font-medium text-charcoal';
  const [copied, setCopied] = useState(false);

  const copyCouponCode = async () => {
    if (!details.couponCode) return;
    try {
      await navigator.clipboard.writeText(details.couponCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  if (!details.couponCode && details.refundAmount == null && details.deduction == null) {
    return null;
  }

  return (
    <div
      className={cn(
        'mt-1.5 space-y-1.5 rounded-md border px-2.5 py-2 text-xs',
        isAdmin ? 'border-[#e2e8f0] bg-[#f8fafc]' : 'border-beige bg-white',
        textClass,
      )}
    >
      {details.couponCode && (
        <div className="flex items-center justify-between gap-2">
          <p>
            Coupon code:{' '}
            <span className={cn('font-mono tracking-wide', labelClass)}>
              {details.couponCode}
            </span>
          </p>
          {!isAdmin && (
            <button
              type="button"
              onClick={() => void copyCouponCode()}
              className="shrink-0 rounded border border-beige px-2 py-0.5 text-[11px] font-medium text-maroon hover:bg-beige/40"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      )}
      {details.refundAmount != null && details.refundAmount > 0 && (
        <p>
          Coupon amount: <span className={labelClass}>{formatPrice(details.refundAmount)}</span>
        </p>
      )}
      {details.deduction != null && details.deduction > 0 && (
        <p>
          Shipping deduction:{' '}
          <span className={labelClass}>{formatPrice(details.deduction)}</span>
        </p>
      )}
    </div>
  );
}

function StepNumberCircle({
  number,
  isCurrent,
  isCancelled,
  size = 'md',
}: {
  number: number;
  isCurrent: boolean;
  isCancelled?: boolean;
  size?: 'sm' | 'md';
}) {
  const dimensions = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-6 w-6 text-[10px]';

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border-2 font-semibold',
        dimensions,
        isCancelled && isCurrent
          ? 'border-orange-500 bg-orange-500 text-white ring-2 ring-orange-500/25'
          : isCurrent
            ? 'border-gold bg-gold text-white ring-2 ring-gold/25'
            : 'border-beige bg-white text-brown-light',
      )}
    >
      {number}
    </div>
  );
}

function getStepLabelClass(isCurrent: boolean, isDone: boolean, isAdmin: boolean) {
  if (isCurrent) {
    return isAdmin ? 'font-medium text-[#0f172a]' : 'font-medium text-charcoal';
  }
  if (isDone) {
    return isAdmin ? 'text-[#64748b]' : 'text-brown-light';
  }
  return isAdmin ? 'text-[#94a3b8]' : 'text-brown-light';
}

function getCurrentStepIndex(order: TrackingOrder, history: Order['trackingHistory']): number {
  const postDeliveryStatuses = new Set(['RETURNED', 'REFUNDED', 'CANCELLED']);
  if (postDeliveryStatuses.has(order.status)) {
    return TRACKING_STEPS.length - 1;
  }

  const orderStatusIndex = TRACKING_STEPS.indexOf(order.status as (typeof TRACKING_STEPS)[number]);
  if (orderStatusIndex >= 0) return orderStatusIndex;

  const latestTrackingStatus = history?.[0]?.status;
  const trackingStatusIndex = TRACKING_STEPS.indexOf(
    latestTrackingStatus as (typeof TRACKING_STEPS)[number],
  );
  if (trackingStatusIndex >= 0) return trackingStatusIndex;

  return 0;
}

interface OrderTrackingTimelineProps {
  order: TrackingOrder;
  returnRequest?: ReturnRequest;
  variant?: 'store' | 'admin';
  continueFromDelivered?: boolean;
}

export function OrderTrackingTimeline({
  order,
  returnRequest,
  variant = 'store',
  continueFromDelivered = false,
}: OrderTrackingTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isAdmin = variant === 'admin';
  const hideTracking = shouldHideOrderTracking(order);

  const history = useMemo(() => order.trackingHistory ?? [], [order.trackingHistory]);
  const returnTimeline = useMemo(
    () => getEffectiveReturnTimeline(order as Order, returnRequest),
    [order, returnRequest],
  );
  const {
    returnRequest: effectiveReturn,
    history: returnHistory,
    horizontalSteps: horizontalReturnSteps,
    currentStatus: returnCurrentStatus,
    refundEntry,
  } = returnTimeline;
  const hasReturnFlow = horizontalReturnSteps.length > 0 || Boolean(refundEntry);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [history],
  );

  const returnHistoryChronological = useMemo(
    () =>
      [...returnHistory].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [returnHistory],
  );

  const currentStep = getCurrentStepIndex(order, history);
  const orderSteps = useMemo(
    () => (continueFromDelivered ? (['DELIVERED'] as const) : TRACKING_STEPS),
    [continueFromDelivered],
  );
  const postRefundSteps = refundEntry ? (['REFUNDED'] as const) : ([] as const);
  const combinedHorizontalSteps = hasReturnFlow
    ? [...orderSteps, ...horizontalReturnSteps, ...postRefundSteps]
    : [...orderSteps];

  const deliveredOnlyCurrent = continueFromDelivered ? 0 : currentStep;

  const combinedCurrentStep = (() => {
    if (!hasReturnFlow) return deliveredOnlyCurrent;
    if (refundEntry) return combinedHorizontalSteps.length - 1;
    return orderSteps.length + getReturnFlowIndex(returnCurrentStatus, effectiveReturn);
  })();

  const statusUpdates = useMemo(() => {
    const map = new Map<string, { timestamp: string; description?: string }>();
    for (const entry of sortedHistory) {
      if (!map.has(entry.status)) {
        map.set(entry.status, { timestamp: entry.timestamp, description: entry.description });
      }
    }
    if (continueFromDelivered && !map.has('DELIVERED')) {
      const deliveredAt = getOrderDeliveredAt(order as Order);
      if (deliveredAt) {
        map.set('DELIVERED', { timestamp: deliveredAt.toISOString() });
      }
    }
    return map;
  }, [sortedHistory, continueFromDelivered, order]);

  const timelineSteps = useMemo<TimelineStep[]>(() => {
    const steps: TimelineStep[] = orderSteps.map((step) => ({
      kind: 'order',
      step,
      timestamp: statusUpdates.get(step)?.timestamp,
    }));

    returnHistoryChronological.forEach((entry) => {
      steps.push({ kind: 'return', entry });
    });

    if (refundEntry) {
      steps.push({ kind: 'refund', entry: refundEntry });
    }

    return steps;
  }, [orderSteps, returnHistoryChronological, refundEntry, statusUpdates]);

  const activeStepIndex = useMemo(() => {
    if (refundEntry) {
      return timelineSteps.length - 1;
    }
    if (returnHistoryChronological.length > 0) {
      return orderSteps.length + returnHistoryChronological.length - 1;
    }
    if (continueFromDelivered) {
      return 0;
    }
    return currentStep;
  }, [
    refundEntry,
    returnHistoryChronological.length,
    timelineSteps.length,
    orderSteps.length,
    continueFromDelivered,
    currentStep,
  ]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const apply = () => {
      const mobile = query.matches;
      setIsMobile(mobile);
      setShowAll(mobile || hasReturnFlow);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [hasReturnFlow]);

  if (hideTracking) {
    return <OrderPaymentStatusNotice order={order} variant={variant} />;
  }

  if (history.length === 0 && !hasReturnFlow) {
    return (
      <div
        className={cn(
          'rounded-lg px-4 py-3 text-sm',
          isAdmin ? 'bg-[#f8fafc] text-[#94a3b8]' : 'mt-6 bg-beige/40 text-brown-light',
        )}
      >
        Tracking updates will appear here once your order moves forward.
      </div>
    );
  }

  const getHorizontalStepLabel = (step: string, index: number) => {
    if (index < orderSteps.length) {
      return getOrderStatusLabel(step);
    }
    if (step === 'REFUNDED') {
      return getReturnStepLabel(step);
    }
    return getReturnStepLabel(step);
  };

  const showRefundCreditNotice = shouldShowRefundCreditNotice(order as Order);

  return (
    <div className={cn(isAdmin ? '' : 'mt-6')}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={cn('text-sm font-medium', isAdmin ? 'text-[#0f172a]' : '')}>Tracking</h3>
        {(history.length > 1 || hasReturnFlow) && !isMobile && (
          <button
            type="button"
            onClick={() => setShowAll((open) => !open)}
            className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
          >
            {showAll ? 'Show less' : 'See all'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')} />
          </button>
        )}
      </div>

      {!showAll ? (
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-0 px-1">
            {combinedHorizontalSteps.map((step, index) => {
              const isDone = index < combinedCurrentStep;
              const isCurrent = index === combinedCurrentStep;
              const isCancelledStep = step === 'PICKUP_CANCELLED';

              return (
                <div key={`${step}-${index}`} className="flex items-center">
                  <div className="flex w-[4.5rem] flex-col items-center sm:w-[5.5rem]">
                    <StepNumberCircle
                      number={index + 1}
                      isCurrent={isCurrent}
                      isCancelled={isCancelledStep}
                      size="sm"
                    />
                    <p
                      className={cn(
                        'mt-2 text-center text-[10px] leading-tight sm:text-[11px]',
                        getStepLabelClass(isCurrent, isDone, isAdmin),
                      )}
                    >
                      {getHorizontalStepLabel(step, index)}
                    </p>
                  </div>
                  {index < combinedHorizontalSteps.length - 1 && (
                    <div
                      className={cn(
                        'mb-5 h-0.5 w-6 sm:w-8',
                        index < combinedCurrentStep ? 'bg-gold' : 'bg-beige',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-0">
          {timelineSteps.map((item, index) => {
            const isCurrent = index === activeStepIndex;
            const isDone = index < activeStepIndex;
            const isLast = index === timelineSteps.length - 1;
            const stepNumber = index + 1;

            if (item.kind === 'order') {
              const update = statusUpdates.get(item.step);
              return (
                <div key={`order-${item.step}`} className="flex gap-3">
                  <div className="flex w-6 flex-col items-center">
                    <StepNumberCircle
                      number={stepNumber}
                      isCurrent={isCurrent}
                    />
                    {!isLast && (
                      <div className={cn('my-1 w-0.5 flex-1', isDone ? 'bg-gold' : 'bg-beige')} />
                    )}
                  </div>
                  <div className="pb-3 pt-0.5">
                    <p className={cn('text-sm', getStepLabelClass(isCurrent, isDone, isAdmin))}>
                      {getOrderStatusLabel(item.step)}
                    </p>
                    {update && (
                      <p className={cn('mt-0.5 text-xs', isAdmin ? 'text-[#94a3b8]' : 'text-brown-light')}>
                        {formatDate(update.timestamp)} at {formatTime(update.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            if (item.kind === 'return') {
              const isCancelled = item.entry.status === 'PICKUP_CANCELLED';
              const label = getReturnEntryLabel(item.entry.status, item.entry.description);

              return (
                <div key={item.entry.id} className="flex gap-3">
                  <div className="flex w-6 flex-col items-center">
                    <StepNumberCircle
                      number={stepNumber}
                      isCurrent={isCurrent}
                      isCancelled={isCancelled}
                    />
                    {!isLast && (
                      <div className={cn('my-1 w-0.5 flex-1', isDone ? 'bg-gold' : 'bg-beige')} />
                    )}
                  </div>
                  <div className="pb-4 pt-0.5">
                    <p
                      className={cn(
                        'text-sm',
                        isCancelled && isCurrent
                          ? isAdmin
                            ? 'font-medium text-orange-700'
                            : 'font-medium text-orange-800'
                          : getStepLabelClass(isCurrent, isDone, isAdmin),
                      )}
                    >
                      {label}
                    </p>
                    <p className={cn('mt-0.5 text-xs', isAdmin ? 'text-[#94a3b8]' : 'text-brown-light')}>
                      {formatDate(item.entry.timestamp)} at {formatTime(item.entry.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.entry.id} className="flex gap-3">
                <div className="flex w-6 flex-col items-center">
                  <StepNumberCircle
                    number={stepNumber}
                    isCurrent={isCurrent}
                  />
                </div>
                <div className="pb-4 pt-0.5">
                  <p className={cn('text-sm', getStepLabelClass(isCurrent, isDone, isAdmin))}>
                    {getReturnEntryLabel(item.entry.status, item.entry.description) || 'Refunded'}
                  </p>
                  <RefundTrackingBlock order={order} isAdmin={isAdmin} />
                  <p className={cn('mt-1.5 text-xs', isAdmin ? 'text-[#94a3b8]' : 'text-brown-light')}>
                    {formatDate(item.entry.timestamp)} at {formatTime(item.entry.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRefundCreditNotice && !refundEntry && (
        <RefundCreditNotice className="mt-4" variant={variant} />
      )}
    </div>
  );
}
