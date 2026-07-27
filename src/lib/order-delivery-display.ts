import type { Order, ShippingAddress } from '@/types';
import { formatDeliveryEstimate } from '@/lib/countries';
import { isHyderabadDeliveryArea, isIndiaShippingAddress } from '@/lib/shipping';
import {
  resolveDeliveryType,
  getDeliveryTypeLabel,
  type DeliveryType,
} from '@/lib/delivery-type';
import { formatDate, formatTime } from '@/lib/utils';

export { resolveDeliveryType, getDeliveryTypeLabel, type DeliveryType };

export type TrackingStepKey = string;

export type DeliveryTrackingProfile = {
  type: DeliveryType;
  steps: TrackingStepKey[];
  statusGroups: Record<string, string[]>;
  stepLabels: Record<string, string>;
};

/** Shared timeline copy — same wording across India, Instant, and International. */
export const TRACKING_STEP_LABELS: Record<string, string> = {
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  READY_TO_SHIP: 'Ready to ship',
  SHIPPED: 'Shipped',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
};

const INDIA_PROFILE: DeliveryTrackingProfile = {
  type: 'INDIA',
  steps: ['PLACED', 'CONFIRMED', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'],
  statusGroups: {
    PLACED: ['PLACED'],
    CONFIRMED: ['CONFIRMED'],
    READY_TO_SHIP: ['READY_TO_SHIP'],
    SHIPPED: ['SHIPPED'],
    IN_TRANSIT: ['IN_TRANSIT'],
    DELIVERED: ['DELIVERED'],
  },
  stepLabels: { ...TRACKING_STEP_LABELS },
};

const QUICK_PROFILE: DeliveryTrackingProfile = {
  type: 'QUICK',
  steps: ['PLACED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED'],
  statusGroups: {
    PLACED: ['PLACED', 'PAYMENT_PENDING'],
    CONFIRMED: ['CONFIRMED'],
    IN_TRANSIT: ['READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT'],
    DELIVERED: ['DELIVERED'],
  },
  stepLabels: {
    PLACED: TRACKING_STEP_LABELS.PLACED,
    CONFIRMED: TRACKING_STEP_LABELS.CONFIRMED,
    IN_TRANSIT: TRACKING_STEP_LABELS.IN_TRANSIT,
    DELIVERED: TRACKING_STEP_LABELS.DELIVERED,
  },
};

const INTERNATIONAL_PROFILE: DeliveryTrackingProfile = {
  type: 'INTERNATIONAL',
  steps: ['PLACED', 'CONFIRMED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'],
  statusGroups: {
    PLACED: ['PLACED', 'PAYMENT_PENDING'],
    CONFIRMED: ['CONFIRMED'],
    READY_TO_SHIP: ['READY_TO_SHIP'],
    SHIPPED: ['SHIPPED', 'IN_TRANSIT'],
    DELIVERED: ['DELIVERED'],
  },
  stepLabels: {
    PLACED: TRACKING_STEP_LABELS.PLACED,
    CONFIRMED: TRACKING_STEP_LABELS.CONFIRMED,
    READY_TO_SHIP: TRACKING_STEP_LABELS.READY_TO_SHIP,
    SHIPPED: TRACKING_STEP_LABELS.SHIPPED,
    DELIVERED: TRACKING_STEP_LABELS.DELIVERED,
  },
};

export function getDeliveryTrackingProfile(
  address?: Partial<ShippingAddress> | null,
  deliveryType?: DeliveryType,
): DeliveryTrackingProfile {
  const type = deliveryType ?? resolveDeliveryType(address);
  if (type === 'QUICK') return QUICK_PROFILE;
  if (type === 'INTERNATIONAL') return INTERNATIONAL_PROFILE;
  return INDIA_PROFILE;
}

export function mapOrderStatusToTrackingStepIndex(
  orderStatus: string,
  profile: DeliveryTrackingProfile,
): number {
  const postDelivery = new Set(['RETURNED', 'REFUNDED', 'CANCELLED']);
  if (postDelivery.has(orderStatus)) {
    return profile.steps.length - 1;
  }

  for (let index = 0; index < profile.steps.length; index += 1) {
    const step = profile.steps[index];
    const group = profile.statusGroups[step] || [step];
    if (group.includes(orderStatus)) return index;
  }

  return 0;
}

export function getTrackingStepLabel(step: string, profile: DeliveryTrackingProfile): string {
  return profile.stepLabels[step] || step;
}

export function getDeliveryBadgeStyles(type: DeliveryType): string {
  switch (type) {
    case 'QUICK':
      return 'border-maroon/25 bg-maroon/10 text-maroon';
    case 'INTERNATIONAL':
      return 'border-indigo-300/80 bg-indigo-50 text-indigo-900';
    default:
      return 'border-gold/35 bg-gold/10 text-charcoal';
  }
}

type DeliverySummaryInput = {
  shippingAddress?: Partial<ShippingAddress> | null;
  estimatedDelivery?: string | null;
  deliveryType?: DeliveryType;
  isHyderabadDelivery?: boolean;
  selectedCourier?: string | null;
  selectedCourierEta?: string | null;
};

export function formatInternationalDeliveryHint(
  address?: Partial<ShippingAddress> | null,
): string | null {
  const eta = address?.selectedCourierEta?.trim();
  if (eta) return formatDeliveryEstimate(eta);
  const courier = address?.selectedCourier?.trim();
  if (courier) return `Via ${courier}`;
  return null;
}

export function formatEstimatedDeliveryMessage(input: DeliverySummaryInput): string {
  const type = input.deliveryType ?? resolveDeliveryType(input.shippingAddress);
  const eta = input.estimatedDelivery ? new Date(input.estimatedDelivery) : null;
  const hasEta = eta != null && Number.isFinite(eta.getTime());
  const intlHint = formatInternationalDeliveryHint(input.shippingAddress);

  if (type === 'QUICK') {
    if (hasEta) {
      const looksLikeDateOnly =
        eta.getHours() === 0 && eta.getMinutes() === 0 && eta.getSeconds() === 0;
      const arriveAt = looksLikeDateOnly ? new Date(Date.now() + 60 * 60 * 1000) : eta;
      return `Instant delivery · arrives by ${formatTime(arriveAt)}`;
    }
    return 'Instant delivery · arrives today';
  }

  if (type === 'INTERNATIONAL') {
    if (intlHint) {
      return `International shipping · ${intlHint}`;
    }
    return hasEta
      ? `International shipping · expected by ${formatDate(eta)}`
      : 'International shipping · timeline updates once dispatched';
  }

  if (
    input.isHyderabadDelivery ??
    (type === 'INDIA' &&
      isHyderabadDeliveryArea({
        city: input.shippingAddress?.city,
        postalCode: input.shippingAddress?.postalCode,
        landmark: input.shippingAddress?.landmark,
        state: input.shippingAddress?.state,
      }))
  ) {
    return 'Standard delivery · arrives in 2 days';
  }

  return 'Standard delivery · expected in 3–7 days';
}

export function getOrderListStatusLine(
  order: Pick<Order, 'status' | 'estimatedDelivery' | 'shippingAddress' | 'shipping' | 'trackingHistory'>,
  displayStatus: string,
): string {
  const deliveryType = resolveDeliveryType(order.shippingAddress);
  const eta = order.estimatedDelivery ? new Date(order.estimatedDelivery) : null;
  const hasEta = eta != null && Number.isFinite(eta.getTime());
  const deliveredAt = order.shipping?.deliveredAt;
  const deliveredUpdate = order.trackingHistory?.find((e) => e.status === 'DELIVERED');
  const deliveredTimestamp = deliveredAt || deliveredUpdate?.timestamp;

  if (displayStatus === 'DELIVERED' && deliveredTimestamp) {
    return `Delivered on ${formatDate(deliveredTimestamp)}`;
  }
  if (displayStatus === 'PAYMENT_PENDING') {
    return 'Complete payment to confirm your order';
  }
  if (displayStatus === 'FAILED') {
    return 'Payment failed — refund in 3–7 days if debited';
  }

  const inTransit = ['READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT'].includes(displayStatus);
  const early = displayStatus === 'PLACED' || displayStatus === 'CONFIRMED';

  if (deliveryType === 'QUICK') {
    if (inTransit || early) {
      if (hasEta) {
        const looksLikeDateOnly =
          eta.getHours() === 0 && eta.getMinutes() === 0 && eta.getSeconds() === 0;
        if (!looksLikeDateOnly) {
          return `Instant · arrives by ${formatTime(eta)}`;
        }
      }
      return inTransit ? 'Instant · rider on the way' : 'Instant · arrives today';
    }
  }

  if (deliveryType === 'INTERNATIONAL') {
    const intlHint = formatInternationalDeliveryHint(order.shippingAddress);
    if (inTransit || early) {
      if (intlHint) return `International · ${intlHint}`;
      return hasEta
        ? `International · expected by ${formatDate(eta)}`
        : 'International · preparing shipment';
    }
  }

  if (inTransit || early) {
    const hyderabad =
      deliveryType === 'INDIA' &&
      isHyderabadDeliveryArea({
        city: order.shippingAddress?.city,
        postalCode: order.shippingAddress?.postalCode,
        landmark: order.shippingAddress?.landmark,
        state: order.shippingAddress?.state,
      });
    if (hyderabad) return 'Standard · arrives in 2 days';
    return 'Standard · expected in 3–7 days';
  }

  return formatEstimatedDeliveryMessage({
    shippingAddress: order.shippingAddress,
    estimatedDelivery: order.estimatedDelivery,
    deliveryType,
  });
}

/** Guard: never treat non-India addresses as instant even if preferredShipping is QUICK. */
export function isInstantDeliveryAddress(address?: ShippingAddress | null): boolean {
  if (!address) return false;
  if (!isIndiaShippingAddress(address.country, address.postalCode, address.countryCode)) {
    return false;
  }
  return address.preferredShipping === 'QUICK';
}
