import { REFUND_CREDIT_DAYS_MESSAGE } from '@/lib/order-return';
import { cn } from '@/lib/utils';

interface RefundCreditNoticeProps {
  className?: string;
  variant?: 'store' | 'admin';
}

export function RefundCreditNotice({ className, variant = 'store' }: RefundCreditNoticeProps) {
  const isAdmin = variant === 'admin';

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 text-xs',
        isAdmin
          ? 'border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]'
          : 'border-gold/30 bg-gold/5 text-brown-light',
        className,
      )}
    >
      <p className={cn('font-medium', isAdmin ? 'text-[#0f172a]' : 'text-charcoal')}>
        Store credit coupon
      </p>
      <p className="mt-1">{REFUND_CREDIT_DAYS_MESSAGE}</p>
    </div>
  );
}
