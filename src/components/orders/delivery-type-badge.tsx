import { cn } from '@/lib/utils';
import {
  getDeliveryBadgeStyles,
  resolveDeliveryType,
  type DeliveryType,
} from '@/lib/order-delivery-display';
import type { ShippingAddress } from '@/types';
import { Globe2, Zap } from 'lucide-react';

type DeliveryTypeBadgeProps = {
  address?: Partial<ShippingAddress> | null;
  type?: DeliveryType;
  className?: string;
  size?: 'sm' | 'md';
};

export function DeliveryTypeBadge({
  address,
  type,
  className,
  size = 'sm',
}: DeliveryTypeBadgeProps) {
  const deliveryType = type ?? resolveDeliveryType(address);
  if (deliveryType === 'INDIA') return null;

  const label = deliveryType === 'QUICK' ? 'Instant delivery' : 'International';

  const Icon = deliveryType === 'QUICK' ? Zap : Globe2;
  const sizeClass =
    size === 'md'
      ? 'px-2.5 py-1 text-[11px] sm:text-xs'
      : 'px-2 py-0.5 text-[10px] sm:text-[11px]';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold uppercase tracking-wide',
        sizeClass,
        getDeliveryBadgeStyles(deliveryType),
        className,
      )}
    >
      <Icon className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden />
      {label}
    </span>
  );
}
