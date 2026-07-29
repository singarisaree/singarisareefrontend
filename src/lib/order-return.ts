import type { Order, ReturnRequest, ReturnRequestStatus } from '@/types';
import { resolveDeliveryType } from '@/lib/delivery-type';

export const RETURN_WINDOW_DAYS = 3;

/** Customer self-serve returns are disabled — contact admin within this window. */
export const DAMAGE_CONTACT_PHONE = '9490458789';
export const DAMAGE_CONTACT_DISPLAY = '+91 9490458789';

const ACTIVE_RETURN_STATUSES: ReturnRequestStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'OUT_FOR_PICKUP',
  'PICKUP_CANCELLED',
  'PICKED_UP',
];

const RETURN_POLICY_SUMMARY =
  'For damages within 3 days of delivery, please contact +91 9490458789. Our team will arrange the return and store credit if approved.';

export function getReturnPolicySummary(): string {
  return RETURN_POLICY_SUMMARY;
}

export function getLatestReturn(order: Order): ReturnRequest | undefined {
  return order.returnRequests?.[0];
}

export function getOrderDeliveredAt(order: Order): Date | null {
  if (order.shipping?.deliveredAt) {
    return new Date(order.shipping.deliveredAt);
  }

  const deliveredEntry = order.trackingHistory?.find((entry) => entry.status === 'DELIVERED');
  if (deliveredEntry) {
    return new Date(deliveredEntry.timestamp);
  }

  if (order.status === 'DELIVERED' && order.updatedAt) {
    return new Date(order.updatedAt);
  }

  return null;
}

export function getReturnDeadline(order: Order): Date | null {
  const deliveredAt = getOrderDeliveredAt(order);
  if (!deliveredAt) return null;

  const deadline = new Date(deliveredAt);
  deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);
  return deadline;
}

export function isWithinReturnWindow(order: Order, now = new Date()): boolean {
  if (order.status !== 'DELIVERED') return false;
  const deadline = getReturnDeadline(order);
  if (!deadline) return false;
  return now <= deadline;
}

export function isInternationalOrder(order: Pick<Order, 'shippingAddress'>): boolean {
  return resolveDeliveryType(order.shippingAddress) === 'INTERNATIONAL';
}

/** Customer self-serve return requests are disabled. */
export function canRequestReturn(_order: Order): boolean {
  return false;
}

export function getReturnableQuantities(order: Order): Record<string, number> {
  const used: Record<string, number> = {};
  for (const request of order.returnRequests ?? []) {
    if (request.status === 'REJECTED') continue;
    for (const item of request.items ?? []) {
      used[item.orderItemId] = (used[item.orderItemId] ?? 0) + item.quantity;
    }
  }

  const available: Record<string, number> = {};
  for (const item of order.items) {
    available[item.id] = Math.max(0, item.quantity - (used[item.id] ?? 0));
  }
  return available;
}

export function hasActiveReturnRequest(order: Order): boolean {
  const latest = getLatestReturn(order);
  return !!latest && ACTIVE_RETURN_STATUSES.includes(latest.status);
}

const RETURN_BAR_BUTTON_LABELS: Record<ReturnRequestStatus, string> = {
  REQUESTED: 'Return Requested',
  ACCEPTED: 'Return Accepted',
  REJECTED: 'Return',
  OUT_FOR_PICKUP: 'Out for Pickup',
  PICKUP_CANCELLED: 'Pickup Cancelled',
  PICKED_UP: 'Picked Up',
  RETURNED: 'Returned',
};

export function getReturnBarButtonLabel(order: Order, isExpanded: boolean): string {
  if (isExpanded) return 'Close';

  const latest = getLatestReturn(order);
  if (latest && hasActiveReturnRequest(order)) {
    return RETURN_BAR_BUTTON_LABELS[latest.status];
  }

  return 'Return';
}

export function getReturnBarStatusLabel(order: Order): string | null {
  const latest = getLatestReturn(order);
  if (!latest) return null;
  if (isReturnRejected(order)) return 'Return Rejected';
  if (hasActiveReturnRequest(order)) {
    return RETURN_BAR_BUTTON_LABELS[latest.status];
  }
  return null;
}

export function isReturnRejected(order: Order): boolean {
  return getLatestReturn(order)?.status === 'REJECTED';
}

function isRefundComplete(
  order: Pick<
    Order,
    | 'status'
    | 'refundedAt'
    | 'refundUtr'
    | 'refundAmount'
    | 'refundCouponId'
    | 'refundCouponCode'
    | 'trackingHistory'
    | 'payments'
  >,
): boolean {
  if (order.status === 'REFUNDED') return true;
  if (order.refundCouponId || order.refundCouponCode) return true;
  if (order.refundedAt) return true;
  if (order.refundUtr) return true;
  if (order.payments?.some((payment) => payment.status === 'REFUNDED')) return true;
  return order.trackingHistory?.some((entry) => entry.status === 'REFUNDED') ?? false;
}

export function isOrderRefunded(order: Order): boolean {
  return isRefundComplete(order);
}

export function getCustomerFacingOrderStatus(order: Order): string {
  let status = order.status;

  if (order.payments?.some((payment) => payment.status === 'SUCCESS')) {
    if (status === 'FAILED' || status === 'PAYMENT_PENDING') {
      status = 'PLACED';
    }
  }

  if (isRefundComplete(order)) {
    return 'REFUNDED';
  }

  if (status === 'DELIVERED' && hasActiveReturnRequest(order)) {
    const latest = getLatestReturn(order);
    if (latest?.status === 'REQUESTED') return 'RETURN_REQUESTED';
    if (latest?.status === 'ACCEPTED') return 'RETURN_ACCEPTED';
    if (latest?.status === 'OUT_FOR_PICKUP') return 'RETURN_OUT_FOR_PICKUP';
    if (latest?.status === 'PICKUP_CANCELLED') return 'RETURN_PICKUP_CANCELLED';
    if (latest?.status === 'PICKED_UP') return 'RETURN_PICKED_UP';
  }

  return status;
}

/** Customer return UI removed — always false. */
export function shouldShowReturnBar(_order: Order): boolean {
  return false;
}

/** Show damage contact message for 3 days after delivery (India orders). */
export function shouldShowDamageContactNotice(order: Order, now = new Date()): boolean {
  if (isInternationalOrder(order)) return false;
  if (isRefundComplete(order)) return false;
  if (order.status !== 'DELIVERED') return false;
  return isWithinReturnWindow(order, now);
}

export function isReturnWindowClosed(order: Order, now = new Date()): boolean {
  if (isInternationalOrder(order)) return false;
  if (order.status !== 'DELIVERED') return false;
  const deadline = getReturnDeadline(order);
  if (!deadline) return false;
  return now > deadline;
}

export function hasPartialReturn(order: Pick<Order, 'status' | 'returnRequests'>): boolean {
  if (order.status !== 'DELIVERED') return false;
  return (order.returnRequests ?? []).some(
    (request) => !request.status || request.status === 'RETURNED',
  );
}

export function isReturnEligible(_order: Order): boolean {
  return false;
}

export function formatReturnDeadline(order: Order): string | null {
  const deadline = getReturnDeadline(order);
  if (!deadline) return null;
  return deadline.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const REFUND_CREDIT_DAYS_MESSAGE =
  'After your return is received, our team may issue a store credit coupon (not a cash refund). Shipping charges may be deducted. The coupon is linked to your order mobile number.';

export function shouldShowRefundCreditNotice(order: Order): boolean {
  if (isRefundComplete(order)) return false;

  const latest = getLatestReturn(order);
  if (latest?.refundCouponCode) return false;
  if (latest?.status === 'PICKED_UP' || latest?.status === 'RETURNED') {
    return true;
  }

  return order.status === 'RETURNED';
}
