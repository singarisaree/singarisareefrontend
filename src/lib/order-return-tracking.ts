import type { Order, ReturnRequest, ReturnRequestStatus, ReturnRequestTrackingEntry } from '@/types';
import { getOrderStatusLabel, getReturnRequestStatusLabel } from '@/lib/utils';
import { getLatestReturn, isOrderRefunded } from '@/lib/order-return';

export const RETURN_FLOW_STEPS = [
  'REQUESTED',
  'ACCEPTED',
  'OUT_FOR_PICKUP',
  'PICKED_UP',
  'RETURNED',
] as const;

const RETURN_STEPS_AFTER_PICKUP = ['PICKED_UP', 'RETURNED'] as const;

export function getReturnEntryLabel(status: string, description?: string | null): string {
  return getFriendlyTrackingDescription(status, description);
}

export function getFriendlyTrackingDescription(status: string, description?: string | null): string {
  if (description?.startsWith('Order status updated to ')) {
    const rawStatus = description.replace('Order status updated to ', '').trim();
    return getOrderStatusLabel(rawStatus);
  }

  if (
    description?.startsWith('Store credit coupon issued') ||
    description?.startsWith('Coupon:')
  ) {
    return 'Refunded';
  }

  if (
    status === 'REFUNDED' ||
    status === 'COUPON_ISSUED' ||
    description?.startsWith('Manual refund of') ||
    description === 'Refund successfully processed'
  ) {
    return 'Refunded';
  }

  if (description) return description;

  if (status.startsWith('RETURN_')) {
    return getReturnRequestStatusLabel(status.slice('RETURN_'.length));
  }

  return getOrderStatusLabel(status) || getReturnRequestStatusLabel(status);
}

export interface RefundTrackingDetails {
  couponCode: string | null;
  deduction: number | null;
  refundAmount: number | null;
}

export function getRefundTrackingDetails(
  order: Pick<
    Order,
    'returnRequests' | 'refundAmount' | 'refundDeduction' | 'refundCouponCode' | 'refundUtr'
  >,
): RefundTrackingDetails {
  const latestReturn = getLatestReturn(order as Order);
  return {
    couponCode: order.refundCouponCode ?? latestReturn?.refundCouponCode ?? null,
    deduction: order.refundDeduction != null ? Number(order.refundDeduction) : null,
    refundAmount: order.refundAmount != null ? Number(order.refundAmount) : null,
  };
}

function hasPickupCancelled(returnRequest: ReturnRequest): boolean {
  if (returnRequest.pickupCancelledAt || returnRequest.status === 'PICKUP_CANCELLED') {
    return true;
  }
  return (returnRequest.trackingHistory ?? []).some((entry) => entry.status === 'PICKUP_CANCELLED');
}

export function buildReturnFallbackHistory(returnRequest: ReturnRequest): ReturnRequestTrackingEntry[] {
  const entries: ReturnRequestTrackingEntry[] = [
    {
      id: `${returnRequest.id}-requested`,
      status: 'REQUESTED',
      description: 'Return request submitted',
      timestamp: returnRequest.createdAt,
    },
  ];

  if (returnRequest.acceptedAt) {
    entries.push({
      id: `${returnRequest.id}-accepted`,
      status: 'ACCEPTED',
      description: 'Return request accepted',
      timestamp: returnRequest.acceptedAt,
    });
  }
  if (returnRequest.rejectedAt) {
    entries.push({
      id: `${returnRequest.id}-rejected`,
      status: 'REJECTED',
      description: 'Return request rejected',
      timestamp: returnRequest.rejectedAt,
    });
  }

  const cancelled = hasPickupCancelled(returnRequest);
  const wasOutForPickup =
    cancelled ||
    returnRequest.status === 'OUT_FOR_PICKUP' ||
    returnRequest.status === 'PICKED_UP' ||
    returnRequest.status === 'RETURNED' ||
    Boolean(returnRequest.pickedUpAt);

  if (wasOutForPickup) {
    entries.push({
      id: `${returnRequest.id}-out-for-pickup`,
      status: 'OUT_FOR_PICKUP',
      description: 'Pickup scheduled — item out for pickup',
      timestamp: returnRequest.pickupCancelledAt || returnRequest.pickedUpAt || returnRequest.updatedAt,
    });
  }

  if (cancelled) {
    entries.push({
      id: `${returnRequest.id}-pickup-cancelled`,
      status: 'PICKUP_CANCELLED',
      description: 'Pickup cancelled',
      timestamp: returnRequest.pickupCancelledAt || returnRequest.updatedAt,
    });
  }

  if (returnRequest.pickedUpAt) {
    entries.push({
      id: `${returnRequest.id}-picked-up`,
      status: 'PICKED_UP',
      description: 'Item pickuped',
      timestamp: returnRequest.pickedUpAt,
    });
  }
  if (returnRequest.returnedAt) {
    entries.push({
      id: `${returnRequest.id}-returned`,
      status: 'RETURNED',
      description: 'Return completed',
      timestamp: returnRequest.returnedAt,
    });
  }

  return entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function getReturnTrackingHistory(returnRequest: ReturnRequest): ReturnRequestTrackingEntry[] {
  if (returnRequest.trackingHistory?.length) {
    return [...returnRequest.trackingHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }
  return buildReturnFallbackHistory(returnRequest);
}

export function getHorizontalReturnSteps(returnRequest: ReturnRequest): string[] {
  if (returnRequest.status === 'REJECTED') {
    return ['REQUESTED', 'REJECTED'];
  }

  const steps: string[] = ['REQUESTED', 'ACCEPTED', 'OUT_FOR_PICKUP'];

  if (hasPickupCancelled(returnRequest)) {
    steps.push('PICKUP_CANCELLED');
  }

  if (returnRequest.status === 'PICKUP_CANCELLED') {
    return steps;
  }

  return [...steps, ...RETURN_STEPS_AFTER_PICKUP];
}

export function getReturnFlowIndex(status: string, returnRequest?: ReturnRequest): number {
  const steps = returnRequest ? getHorizontalReturnSteps(returnRequest) : [...RETURN_FLOW_STEPS];

  if (status === 'REJECTED') {
    return Math.max(0, steps.indexOf('REJECTED'));
  }

  if (status === 'REFUNDED') {
    const returnedIdx = steps.indexOf('RETURNED');
    if (returnedIdx >= 0) return returnedIdx;
    return Math.max(0, steps.length - 1);
  }

  const index = steps.indexOf(status);
  if (index >= 0) return index;

  if (status === 'PICKUP_CANCELLED') {
    return Math.max(0, steps.indexOf('PICKUP_CANCELLED'));
  }

  return 0;
}

export function getReturnStepLabel(status: string): string {
  if (status === 'REFUNDED' || status === 'COUPON_ISSUED') return 'Refunded';
  return getReturnRequestStatusLabel(status);
}

function parseReturnStatusFromOrderTracking(status: string): ReturnRequestStatus | 'REFUNDED' | null {
  if (status.startsWith('RETURN_')) {
    return status.slice('RETURN_'.length) as ReturnRequestStatus;
  }
  if (status === 'RETURNED') return 'RETURNED';
  if (status === 'REFUNDED') return 'REFUNDED';
  return null;
}

function hasSyncedReturnTracking(order: Pick<Order, 'trackingHistory' | 'status'>): boolean {
  const history = order.trackingHistory ?? [];
  return (
    history.some((entry) => parseReturnStatusFromOrderTracking(entry.status) !== null) ||
    order.status === 'RETURNED' ||
    order.status === 'REFUNDED'
  );
}

export function getOrderReturnTrackingHistory(
  order: Pick<Order, 'trackingHistory' | 'status'>,
): ReturnRequestTrackingEntry[] {
  const sorted = [...(order.trackingHistory ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const entries: ReturnRequestTrackingEntry[] = [];
  const seen = new Set<string>();

  for (const entry of sorted) {
    const parsed = parseReturnStatusFromOrderTracking(entry.status);
    if (!parsed || parsed === 'REFUNDED' || seen.has(parsed)) continue;
    seen.add(parsed);
    entries.push({
      id: `order-tracking-${entry.status}-${entry.timestamp}`,
      status: parsed,
      description: entry.description,
      timestamp: entry.timestamp,
    });
  }

  if (!seen.has('RETURNED') && order.status === 'RETURNED' && !isOrderRefunded(order as Order)) {
    entries.push({
      id: `order-status-returned`,
      status: 'RETURNED',
      description: 'Returned',
      timestamp: sorted[sorted.length - 1]?.timestamp ?? new Date().toISOString(),
    });
  }

  return entries;
}

export function getOrderRefundTrackingEntry(
  order: Pick<
    Order,
    | 'trackingHistory'
    | 'status'
    | 'refundedAt'
    | 'refundUtr'
    | 'refundAmount'
    | 'refundCouponId'
    | 'refundCouponCode'
    | 'payments'
  >,
): ReturnRequestTrackingEntry | null {
  const orderLevelRefunded =
    order.status === 'REFUNDED' ||
    order.refundCouponId != null ||
    order.refundCouponCode != null ||
    order.refundedAt != null ||
    order.refundUtr != null ||
    order.payments?.some((payment) => payment.status === 'REFUNDED');

  if (!orderLevelRefunded) return null;

  const refundEntry = [...(order.trackingHistory ?? [])]
    .reverse()
    .find((entry) => entry.status === 'REFUNDED' || entry.status === 'COUPON_ISSUED');
  if (refundEntry) {
    return {
      id: `order-tracking-refunded-${refundEntry.timestamp}`,
      status: 'REFUNDED',
      description: refundEntry.description,
      timestamp: refundEntry.timestamp,
    };
  }

  return {
    id: 'order-status-refunded',
    status: 'REFUNDED',
    description: order.refundCouponCode
      ? `Store credit coupon issued: ${order.refundCouponCode}`
      : 'Store credit coupon issued',
    timestamp: order.refundedAt ?? new Date().toISOString(),
  };
}

export function getHorizontalStepsFromOrderReturnHistory(
  history: ReturnRequestTrackingEntry[],
): string[] {
  if (!history.length) return [];

  const synthetic: ReturnRequest = {
    id: 'order-sync',
    orderId: '',
    customerPhone: '',
    status: history[history.length - 1].status as ReturnRequestStatus,
    reason: '',
    phonePeNumber: null,
    phonePeAccountName: null,
    createdAt: history[0].timestamp,
    updatedAt: history[history.length - 1].timestamp,
    acceptedAt: history.find((e) => e.status === 'ACCEPTED')?.timestamp ?? null,
    rejectedAt: history.find((e) => e.status === 'REJECTED')?.timestamp ?? null,
    pickedUpAt: history.find((e) => e.status === 'PICKED_UP')?.timestamp ?? null,
    returnedAt: history.find((e) => e.status === 'RETURNED')?.timestamp ?? null,
    pickupCancelledAt: history.find((e) => e.status === 'PICKUP_CANCELLED')?.timestamp ?? null,
    trackingHistory: history,
    images: [],
  };

  return getHorizontalReturnSteps(synthetic);
}

export function getEffectiveReturnTimeline(
  order: Order,
  explicitReturn?: ReturnRequest,
): {
  returnRequest?: ReturnRequest;
  history: ReturnRequestTrackingEntry[];
  horizontalSteps: string[];
  currentStatus: string;
  fromOrderTracking: boolean;
  refundEntry: ReturnRequestTrackingEntry | null;
} {
  const orderRefundEntry = getOrderRefundTrackingEntry(order);

  const refundEntryForReturn = (ret?: ReturnRequest): ReturnRequestTrackingEntry | null => {
    if (orderRefundEntry) return orderRefundEntry;
    if (ret?.refundCouponCode) {
      return {
        id: `return-coupon-${ret.id}`,
        status: 'REFUNDED',
        description: `Store credit coupon issued: ${ret.refundCouponCode}`,
        timestamp: ret.returnedAt ?? ret.updatedAt,
      };
    }
    return null;
  };

  if (explicitReturn) {
    const history = getReturnTrackingHistory(explicitReturn);
    const refundEntry = refundEntryForReturn(explicitReturn);
    return {
      returnRequest: explicitReturn,
      history,
      horizontalSteps: getHorizontalReturnSteps(explicitReturn),
      currentStatus: refundEntry ? 'REFUNDED' : explicitReturn.status,
      fromOrderTracking: false,
      refundEntry,
    };
  }

  const latestReturn = getLatestReturn(order);

  if (latestReturn && latestReturn.status !== 'REJECTED') {
    const history = getReturnTrackingHistory(latestReturn);
    const refundEntry = refundEntryForReturn(latestReturn);
    return {
      returnRequest: latestReturn,
      history,
      horizontalSteps: getHorizontalReturnSteps(latestReturn),
      currentStatus: refundEntry ? 'REFUNDED' : latestReturn.status,
      fromOrderTracking: false,
      refundEntry,
    };
  }

  if (hasSyncedReturnTracking(order)) {
    const history = getOrderReturnTrackingHistory(order);
    const horizontalSteps = getHorizontalStepsFromOrderReturnHistory(history);
    const refundEntry = orderRefundEntry;
    const currentStatus = refundEntry
      ? 'REFUNDED'
      : (history[history.length - 1]?.status ?? order.status);
    return {
      history,
      horizontalSteps,
      currentStatus,
      fromOrderTracking: true,
      refundEntry,
    };
  }

  if (latestReturn) {
    const history = getReturnTrackingHistory(latestReturn);
    const refundEntry = refundEntryForReturn(latestReturn);
    return {
      returnRequest: latestReturn,
      history,
      horizontalSteps: getHorizontalReturnSteps(latestReturn),
      currentStatus: refundEntry ? 'REFUNDED' : latestReturn.status,
      fromOrderTracking: false,
      refundEntry,
    };
  }

  return {
    history: [],
    horizontalSteps: [],
    currentStatus: orderRefundEntry ? 'REFUNDED' : order.status,
    fromOrderTracking: false,
    refundEntry: orderRefundEntry,
  };
}
