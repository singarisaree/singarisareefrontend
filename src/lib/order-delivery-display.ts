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

/** True once admin has booked Shiprocket (AWB / shipment id) or order is in fulfillment. */
export function isOrderShipmentBooked(
  order: Pick<Order, 'status' | 'shipping'>,
): boolean {
  if (order.shipping?.awbCode?.trim() || order.shipping?.shiprocketShipmentId?.trim()) {
    return true;
  }
  return ['READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT'].includes(order.status);
}

function formatCheckoutStandardPromise(
  shippingAddress?: Partial<ShippingAddress> | null,
  deliveryType?: DeliveryType,
): string {
  const type = deliveryType ?? resolveDeliveryType(shippingAddress);
  if (type === 'INTERNATIONAL') {
    const intlHint = formatInternationalDeliveryHint(shippingAddress);
    return intlHint
      ? `International shipping · ${intlHint}`
      : 'International shipping · timeline at checkout';
  }
  const hyderabad =
    type === 'INDIA' &&
    isHyderabadDeliveryArea({
      city: shippingAddress?.city,
      postalCode: shippingAddress?.postalCode,
      landmark: shippingAddress?.landmark,
      state: shippingAddress?.state,
    });
  return hyderabad
    ? 'Standard delivery · arrives in 2 days'
    : 'Standard delivery · expected in 3–7 days';
}

/** Live courier ETA after admin creates shipment (Shiprocket). */
export function formatCarrierDeliveryStatusLine(
  order: Pick<Order, 'estimatedDelivery' | 'shippingAddress' | 'shipping'>,
  deliveryType: DeliveryType,
): string {
  const eta = order.estimatedDelivery ? new Date(order.estimatedDelivery) : null;
  const hasEta = eta != null && Number.isFinite(eta.getTime());
  const courier =
    order.shipping?.courierName?.trim() || order.shippingAddress?.selectedCourier?.trim() || null;
  const etaRange = order.shippingAddress?.selectedCourierEta?.trim()
    ? formatDeliveryEstimate(order.shippingAddress.selectedCourierEta)
    : null;
  const prefix = deliveryType === 'INTERNATIONAL' ? 'International' : 'Standard';

  if (hasEta) {
    const byDate = formatDate(eta);
    if (courier) return `${prefix} · ${courier} · expected by ${byDate}`;
    return `${prefix} · expected by ${byDate}`;
  }
  if (etaRange) {
    if (courier) return `${prefix} · ${courier} · ${etaRange}`;
    return `${prefix} · ${etaRange}`;
  }
  if (courier) return `${prefix} · via ${courier}`;
  return deliveryType === 'INTERNATIONAL'
    ? 'International · preparing shipment'
    : 'Standard · preparing shipment';
}

export function formatEstimatedDeliveryMessage(input: DeliverySummaryInput): string {
  const type = input.deliveryType ?? resolveDeliveryType(input.shippingAddress);
  const eta = input.estimatedDelivery ? new Date(input.estimatedDelivery) : null;
  const hasEta = eta != null && Number.isFinite(eta.getTime());

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
    const intlHint = formatInternationalDeliveryHint(input.shippingAddress);
    if (intlHint) {
      return `International shipping · ${intlHint}`;
    }
    return hasEta
      ? `International shipping · expected by ${formatDate(eta)}`
      : 'International shipping · timeline updates once dispatched';
  }

  if (type === 'INDIA') {
    const hyderabad =
      input.isHyderabadDelivery ??
      isHyderabadDeliveryArea({
        city: input.shippingAddress?.city,
        postalCode: input.shippingAddress?.postalCode,
        landmark: input.shippingAddress?.landmark,
        state: input.shippingAddress?.state,
      });
    return hyderabad
      ? 'Standard delivery · arrives in 2 days'
      : 'Standard delivery · expected in 3–7 days';
  }

  return formatCheckoutStandardPromise(input.shippingAddress, type);
}

function formatCheckoutStandardPromiseShort(
  order: Pick<Order, 'shippingAddress'>,
  deliveryType: DeliveryType,
): string {
  if (deliveryType === 'INTERNATIONAL') {
    const intlHint = formatInternationalDeliveryHint(order.shippingAddress);
    return intlHint ? `International · ${intlHint}` : 'International · preparing shipment';
  }
  const hyderabad =
    deliveryType === 'INDIA' &&
    isHyderabadDeliveryArea({
      city: order.shippingAddress?.city,
      postalCode: order.shippingAddress?.postalCode,
      landmark: order.shippingAddress?.landmark,
      state: order.shippingAddress?.state,
    });
  return hyderabad ? 'Standard · arrives in 2 days' : 'Standard · expected in 3–7 days';
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
  const shipmentBooked = isOrderShipmentBooked(order);

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

  if (deliveryType === 'INTERNATIONAL' || deliveryType === 'INDIA') {
    if (early && !shipmentBooked) {
      return formatCheckoutStandardPromiseShort(order, deliveryType);
    }
    if (inTransit || shipmentBooked) {
      return formatCarrierDeliveryStatusLine(order, deliveryType);
    }
  }

  if (inTransit || early) {
    return formatCheckoutStandardPromiseShort(order, deliveryType);
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
