import type { ShippingAddress } from '@/types';
import { isIndiaShippingAddress } from '@/lib/shipping';

export type DeliveryType = 'INDIA' | 'INTERNATIONAL' | 'QUICK';

export function resolveDeliveryType(address?: ShippingAddress | null): DeliveryType {
  if (!address) return 'INDIA';
  if (address.preferredShipping === 'QUICK') return 'QUICK';
  if (!isIndiaShippingAddress(address.country, address.postalCode, address.countryCode)) {
    return 'INTERNATIONAL';
  }
  return 'INDIA';
}

export function getDeliveryTypeLabel(type: DeliveryType): string {
  switch (type) {
    case 'QUICK':
      return 'Instant';
    case 'INTERNATIONAL':
      return 'International';
    default:
      return 'India';
  }
}

export function applyDeliveryTypeToAddress(
  address: ShippingAddress,
  type: DeliveryType,
): ShippingAddress {
  if (type === 'QUICK') {
    return {
      ...address,
      preferredShipping: 'QUICK',
      country: address.country?.trim() || 'India',
      countryCode: 'IN',
    };
  }
  if (type === 'INDIA') {
    return {
      ...address,
      preferredShipping: 'STANDARD',
      country: 'India',
      countryCode: 'IN',
    };
  }
  return {
    ...address,
    preferredShipping: 'STANDARD',
  };
}
