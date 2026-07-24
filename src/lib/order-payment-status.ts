import type { UseQueryOptions } from '@tanstack/react-query';
import { orderService } from '@/services/store.service';

export type OrderPaymentStatus = {
  status: string;
  paymentStatus: string;
  orderNumber: string;
  estimatedDelivery?: string | null;
  deliveryType?: 'QUICK' | 'INDIA' | 'INTERNATIONAL';
  isHyderabadDelivery?: boolean;
};

const SUCCESS_STATUSES = new Set([
  'PLACED',
  'CONFIRMED',
  'READY_TO_SHIP',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
]);

export function hasSuccessfulPayment(payments?: Array<{ status: string }>): boolean {
  return payments?.some((payment) => payment.status === 'SUCCESS') ?? false;
}

/** Never show failed/pending when payment already succeeded */
export function getEffectiveCustomerOrderStatus(order: {
  status: string;
  payments?: Array<{ status: string }>;
  refundedAt?: string | null;
  refundUtr?: string | null;
  refundCouponId?: string | null;
  refundCouponCode?: string | null;
  refundAmount?: number | string | null;
  trackingHistory?: Array<{ status: string }>;
}): string {
  if (order.payments?.some((payment) => payment.status === 'SUCCESS')) {
    if (order.status === 'FAILED' || order.status === 'PAYMENT_PENDING') {
      return 'PLACED';
    }
  }
  if (
    order.status === 'REFUNDED' ||
    order.refundCouponId ||
    order.refundCouponCode ||
    order.refundedAt ||
    order.refundUtr ||
    order.payments?.some((payment) => payment.status === 'REFUNDED') ||
    order.trackingHistory?.some((entry) => entry.status === 'REFUNDED')
  ) {
    return 'REFUNDED';
  }
  return order.status;
}

export function isOrderPaymentSuccess(data: OrderPaymentStatus) {
  return data.paymentStatus === 'SUCCESS' || SUCCESS_STATUSES.has(data.status);
}

export function isOrderPaymentFailed(data: OrderPaymentStatus) {
  if (data.paymentStatus === 'SUCCESS') return false;
  if (SUCCESS_STATUSES.has(data.status)) return false;
  return (
    data.status === 'FAILED' ||
    data.status === 'CANCELLED' ||
    data.paymentStatus === 'FAILED'
  );
}

export function isOrderPaymentPending(data: OrderPaymentStatus) {
  if (data.paymentStatus === 'SUCCESS') return false;
  return !isOrderPaymentSuccess(data) && !isOrderPaymentFailed(data);
}

function paymentStatusPollInterval(data: OrderPaymentStatus | undefined, fast: boolean) {
  if (!data) return fast ? 250 : 1500;
  return isOrderPaymentPending(data) ? (fast ? 250 : 1500) : false;
}

export function orderPaymentStatusQueryOptions(
  orderId: string | null,
): UseQueryOptions<OrderPaymentStatus> {
  return {
    queryKey: ['payment-status', orderId],
    queryFn: () => orderService.getPaymentStatus(orderId!),
    enabled: !!orderId,
    retry: 8,
    refetchInterval: (query) => paymentStatusPollInterval(query.state.data, false),
  };
}

/** Faster polling after Razorpay redirects back to the store. */
export function orderPaymentReturnQueryOptions(
  orderId: string | null,
): UseQueryOptions<OrderPaymentStatus> {
  return {
    queryKey: ['payment-status', orderId, 'return'],
    queryFn: () => orderService.getPaymentStatus(orderId!, 'return'),
    enabled: !!orderId,
    retry: 12,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (query) => paymentStatusPollInterval(query.state.data, true),
  };
}
