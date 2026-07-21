import { cn } from '@/lib/utils';
import { getCustomerFacingOrderStatus } from '@/lib/order-return';
import type { Order } from '@/types';

type OrderStatusInput = Pick<Order, 'status' | 'payments' | 'refundedAt' | 'refundUtr' | 'trackingHistory'>;

export function shouldHideOrderTracking(order: OrderStatusInput): boolean {
  const status = getCustomerFacingOrderStatus(order as Order);
  return status === 'FAILED' || status === 'PAYMENT_PENDING';
}

interface OrderPaymentStatusNoticeProps {
  order: OrderStatusInput;
  className?: string;
  variant?: 'store' | 'admin';
}

export function OrderPaymentStatusNotice({
  order,
  className,
  variant = 'store',
}: OrderPaymentStatusNoticeProps) {
  const isAdmin = variant === 'admin';
  const status = getCustomerFacingOrderStatus(order as Order);

  if (status === 'FAILED') {
    return (
      <div
        className={cn(
          'rounded-lg border px-4 py-4',
          isAdmin
            ? 'border-red-200 bg-red-50'
            : 'mt-6 border-red-200 bg-red-50',
          className,
        )}
      >
        <h3 className={cn('text-sm font-medium', isAdmin ? 'text-red-900' : 'text-red-900')}>
          Payment Failed
        </h3>
        <p className={cn('mt-2 text-sm', isAdmin ? 'text-red-800' : 'text-red-800')}>
          {isAdmin
            ? 'Customer payment was not completed. No successful payment is recorded for this order.'
            : 'Payment was not successful. If any amount was debited, it will be auto-refunded within 3 to 7 working days. Please place a new order to try again.'}
        </p>
      </div>
    );
  }

  if (status === 'PAYMENT_PENDING') {
    return (
      <div
        className={cn(
          'rounded-lg border px-4 py-4',
          isAdmin
            ? 'border-amber-200 bg-amber-50'
            : 'mt-6 border-amber-200 bg-amber-50',
          className,
        )}
      >
        <h3 className={cn('text-sm font-medium', isAdmin ? 'text-amber-900' : 'text-amber-900')}>
          Payment Pending
        </h3>
        <p className={cn('mt-2 text-sm', isAdmin ? 'text-amber-800' : 'text-amber-800')}>
          {isAdmin
            ? 'Waiting for payment confirmation. Status updates automatically.'
            : 'We are confirming your payment. This page updates automatically — no action needed.'}
        </p>
      </div>
    );
  }

  return null;
}
