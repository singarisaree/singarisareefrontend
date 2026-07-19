import { cn } from '@/lib/utils';

type BadgeVariant = 'active' | 'inactive' | 'pending' | 'danger' | 'neutral';

const variants: Record<BadgeVariant, string> = {
  active: 'bg-[#dcfce7] text-[#16a34a]',
  inactive: 'bg-[#f1f5f9] text-[#64748b]',
  pending: 'bg-[#fef9c3] text-[#ca8a04]',
  danger: 'bg-[#fee2e2] text-[#dc2626]',
  neutral: 'bg-[#e0e7ff] text-[#4338ca]',
};

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function StatusBadge({ children, variant = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function orderStatusVariant(status: string): BadgeVariant {
  if (['DELIVERED', 'CONFIRMED'].includes(status)) return 'active';
  if (['CANCELLED', 'FAILED', 'RTO'].includes(status)) return 'danger';
  if (status === 'REFUNDED') return 'active';
  if (status === 'RETURNED') return 'inactive';
  if (['PLACED', 'PAYMENT_PENDING'].includes(status)) return 'pending';
  if (status === 'INACTIVE' || status === 'Inactive') return 'inactive';
  return 'neutral';
}

export function marketingMessageVariant(status: string): BadgeVariant {
  if (status === 'SENT') return 'active';
  if (status === 'FAILED') return 'danger';
  return 'inactive';
}

export function returnRequestStatusVariant(status: string): BadgeVariant {
  if (status === 'RETURNED' || status === 'ACCEPTED' || status === 'PICKED_UP') return 'active';
  if (status === 'REJECTED' || status === 'PICKUP_CANCELLED') return 'danger';
  if (status === 'REQUESTED' || status === 'OUT_FOR_PICKUP') return 'pending';
  return 'neutral';
}
