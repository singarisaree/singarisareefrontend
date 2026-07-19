import type { PublicSettings } from '@/types';
import { formatPrice } from '@/lib/utils';
import { isIndiaCountry } from '@/lib/countries';

function isTruthy(value: unknown): boolean {
  return value === true || value === 'true';
}

export function isIndiaShippingAddress(country?: string, postalCode?: string, countryCode?: string): boolean {
  if (isIndiaCountry(country, countryCode)) return true;
  const normalizedCountry = (country || '').trim().toLowerCase();
  const normalizedPostal = (postalCode || '').trim();
  const looksLikeIndianPincode = /^\d{6}$/.test(normalizedPostal);

  if (!normalizedCountry && !countryCode && looksLikeIndianPincode) return true;
  if (!normalizedCountry && !countryCode && !normalizedPostal) return true;
  return false;
}

const HYDERABAD_MARKERS = [
  'hyderabad',
  'secunderabad',
  'cyberabad',
  'kukatpally',
  'gachibowli',
  'madhapur',
  'hitech city',
  'hitec city',
];

/** Hyderabad metro → Standard delivery is 2 days. */
export function isHyderabadDeliveryArea(input?: {
  city?: string;
  postalCode?: string;
  landmark?: string;
  state?: string;
}): boolean {
  if (!input) return false;
  const pin = (input.postalCode || '').replace(/\D/g, '');
  if (/^500\d{3}$/.test(pin)) return true;
  const haystack = [input.city, input.landmark, input.state]
    .map((part) => (part || '').trim().toLowerCase())
    .join(' ');
  return HYDERABAD_MARKERS.some((marker) => haystack.includes(marker));
}

export function getIndiaShippingMessage(shippingCharge: number, settings?: PublicSettings): string {
  if (shippingCharge === 0) {
    if (isTruthy(settings?.free_shipping_enabled)) {
      return 'Free shipping applies for all India orders.';
    }
    const threshold = Number(settings?.free_shipping_threshold ?? 1999);
    return `Free shipping on India orders above ${formatPrice(threshold)}.`;
  }
  return 'India domestic shipping charge applied.';
}

/** India domestic shipping only. International orders use Shiprocket X fare quotes. */
export function calculateShippingCharge(subtotal: number, settings?: PublicSettings): number {
  if (!settings) return subtotal >= 1999 ? 0 : 99;

  if (isTruthy(settings.free_shipping_enabled)) {
    return 0;
  }

  const charge = Number(settings.default_shipping_charge ?? 99);
  const threshold = Number(settings.free_shipping_threshold ?? 1999);
  return subtotal >= threshold ? 0 : charge;
}

export function isAddressReadyForShippingQuote(input: {
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  postalValid: boolean;
}): boolean {
  return Boolean(
    input.country?.trim() &&
      input.countryCode?.trim() &&
      input.state?.trim() &&
      input.city?.trim() &&
      input.postalCode?.trim() &&
      input.postalValid,
  );
}

export function calculateOrderSummary(
  subtotal: number,
  couponDiscount: number,
  settings?: PublicSettings,
) {
  const afterDiscount = subtotal - couponDiscount;
  const shippingCharge = calculateShippingCharge(subtotal, settings);
  const grandTotal = afterDiscount + shippingCharge;

  return {
    afterDiscount,
    shippingCharge,
    grandTotal,
  };
}
