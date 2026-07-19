import { isAxiosError } from 'axios';
import { formatAmount } from '@/lib/utils';

export function getApiErrorMessage(error: unknown): string | undefined {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
}

function parseMinOrderAmount(message?: string): number | undefined {
  if (!message) return undefined;
  const match = message.match(/minimum order (?:amount|value) is Rs\.?\s*([\d,]+)/i);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : undefined;
}

export function formatCouponMinOrderMessage(
  minAmount: number,
  options?: { couponCode?: string; removed?: boolean },
): string {
  const formatted = `Rs. ${formatAmount(minAmount)}`;
  if (options?.removed && options.couponCode) {
    return `Coupon ${options.couponCode} removed — minimum order value is ${formatted}`;
  }
  return `Minimum order value is ${formatted} to use this coupon`;
}

export function formatCouponErrorMessage(
  error: unknown,
  options?: { couponCode?: string; removed?: boolean },
): string {
  const apiMessage = getApiErrorMessage(error);
  const minAmount = parseMinOrderAmount(apiMessage);

  if (minAmount !== undefined) {
    return formatCouponMinOrderMessage(minAmount, {
      couponCode: options?.couponCode,
      removed: options?.removed,
    });
  }

  if (options?.removed && options.couponCode) {
    return apiMessage
      ? `Coupon ${options.couponCode} removed — ${apiMessage}`
      : `Coupon ${options.couponCode} removed — your cart no longer qualifies`;
  }

  return apiMessage || 'Invalid coupon code';
}
