import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Product } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return `Rs. ${formatAmount(amount)}`;
}

/** Indian number format without currency symbol — use with Rs. / MRP labels */
export function formatAmount(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

/** Date + time, e.g. "11 July 2026, 1:16 pm" */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** Short customer-facing order ID (last 8 chars). Used across the whole app. */
export function formatShortOrderNumber(orderNumber: string): string {
  if (!orderNumber) return '';
  return orderNumber.length > 8 ? orderNumber.slice(-8) : orderNumber;
}

export function getOrderListDateText(order: {
  status: string;
  createdAt: string;
  updatedAt?: string;
  refundedAt?: string | null;
  trackingHistory?: Array<{ status: string; timestamp: string }>;
}): string {
  const { status, createdAt, updatedAt, refundedAt, trackingHistory } = order;
  const placedAt =
    trackingHistory?.find((entry) => entry.status === 'PLACED')?.timestamp ?? createdAt;
  const formattedCreated = formatDateTime(createdAt);
  const formattedPlaced = formatDateTime(placedAt);
  const formattedUpdated = formatDateTime(updatedAt ?? createdAt);
  const formattedRefunded = formatDateTime(refundedAt ?? updatedAt ?? createdAt);

  switch (status) {
    case 'PAYMENT_PENDING':
      return `Payment pending since ${formattedCreated}`;
    case 'FAILED':
      return `Payment failed on ${formattedUpdated}`;
    case 'CANCELLED':
      return `Cancelled on ${formattedUpdated}`;
    case 'REFUNDED':
      return `Refunded on ${formattedRefunded}`;
    case 'RETURNED':
      return `Returned on ${formattedUpdated}`;
    case 'RTO':
      return `Returned to seller on ${formattedUpdated}`;
    case 'PLACED':
    case 'CONFIRMED':
    case 'READY_TO_SHIP':
    case 'SHIPPED':
    case 'IN_TRANSIT':
    case 'DELIVERED':
      return `Placed on ${formattedPlaced}`;
    default:
      return `Ordered on ${formattedCreated}`;
  }
}

export function calculateDiscount(mrp: number, price: number): number {
  if (!mrp || mrp <= 0 || !Number.isFinite(mrp) || !Number.isFinite(price)) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** True only when every color/variant has no available stock */
export function isProductFullyOutOfStock(product: Pick<Product, 'colors' | 'totalStock' | 'isOutOfStock'>): boolean {
  if (product.isOutOfStock !== undefined) return product.isOutOfStock;
  if (product.colors?.length) {
    return product.colors.every((color) => color.availableStock <= 0);
  }
  return product.totalStock <= 0;
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PLACED: 'bg-blue-100 text-blue-800',
    PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    READY_TO_SHIP: 'bg-yellow-100 text-yellow-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    IN_TRANSIT: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-emerald-100 text-emerald-800',
    RETURNED: 'bg-violet-100 text-violet-800',
    REFUNDED: 'bg-teal-100 text-teal-800',
    CANCELLED: 'bg-red-100 text-red-800',
    FAILED: 'bg-red-100 text-red-800',
    RTO: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLACED: 'Placed',
    PAYMENT_PENDING: 'Payment Pending',
    CONFIRMED: 'Confirmed',
    READY_TO_SHIP: 'Ready to Ship',
    SHIPPED: 'Shipped',
    IN_TRANSIT: 'In Transit',
    DELIVERED: 'Delivered',
    RETURNED: 'Returned',
    REFUNDED: 'Refunded',
    CANCELLED: 'Cancelled',
    FAILED: 'Failed',
    RTO: 'RTO',
  };
  return labels[status] || status;
}

/** Label for applied cart/order discount line. */
export function formatCouponDiscountLabel(
  options?: {
    couponCode?: string | null;
    isRefundCoupon?: boolean | null;
  },
): string {
  const code = options?.couponCode?.trim();
  if (options?.isRefundCoupon) {
    return code ? `Refund Coupon (${code})` : 'Refund Coupon';
  }
  return code ? `Coupon Discount (${code})` : 'Coupon Discount';
}

/** Human-readable payment method for storefront + admin. */
export function formatPaymentMethodLabel(
  payment?: {
    method?: string | null;
    transactionId?: string | null;
  } | null,
  options?: { couponCode?: string | null; grandTotal?: number | null },
): string {
  const method = (payment?.method || '').toUpperCase();
  const isStoreCredit =
    method === 'STORE_CREDIT' ||
    payment?.transactionId === 'ZERO_TOTAL' ||
    (method === 'ADMIN' &&
      (payment?.transactionId === 'ZERO_TOTAL' || Number(options?.grandTotal) === 0));

  if (isStoreCredit) {
    const code = options?.couponCode?.trim();
    return code ? `Store Credit (${code})` : 'Store Credit';
  }

  if (method === 'RAZORPAY') return 'Online';
  if (method === 'COD') return 'Cash on Delivery';
  if (method === 'ADMIN') return 'Admin';
  return payment?.method || 'N/A';
}

export function getTrackingStatusLabel(status: string): string {
  if (status.startsWith('RETURN_')) {
    return getReturnRequestStatusLabel(status.slice('RETURN_'.length));
  }
  return getOrderStatusLabel(status);
}

export function getReturnRequestStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    REQUESTED: 'Return Requested',
    ACCEPTED: 'Return Accepted',
    REJECTED: 'Return Rejected',
    OUT_FOR_PICKUP: 'Out for Pickup',
    PICKUP_CANCELLED: 'Pickup Cancelled',
    PICKED_UP: 'Picked Up',
    RETURNED: 'Returned',
  };
  return labels[status] || status;
}

export function getReturnRequestStatusColor(status: string): string {
  const colors: Record<string, string> = {
    REQUESTED: 'bg-amber-100 text-amber-800',
    ACCEPTED: 'bg-blue-100 text-blue-800',
    REJECTED: 'bg-red-100 text-red-800',
    OUT_FOR_PICKUP: 'bg-indigo-100 text-indigo-800',
    PICKUP_CANCELLED: 'bg-orange-100 text-orange-800',
    PICKED_UP: 'bg-violet-100 text-violet-800',
    RETURNED: 'bg-emerald-100 text-emerald-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

const PLACEHOLDER_NAME_PARTS = new Set(['na', 'n/a', 'nil', 'none', '-', '.']);

/** Strip filler tokens like "na" from customer names for display. */
export function formatCustomerName(name: string): string {
  const cleaned = name
    .trim()
    .split(/\s+/)
    .filter((part) => !PLACEHOLDER_NAME_PARTS.has(part.toLowerCase().replace(/\./g, '')))
    .join(' ')
    .trim();

  return cleaned || name.trim();
}

export function formatColorLabel(colorName: string): string {
  const trimmed = colorName.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
