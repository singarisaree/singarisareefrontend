export interface ShippingCountry {
  id?: number;
  name: string;
  isoCode: string;
  dialCode: string;
  postcodeRequired?: boolean;
  postalRegex?: string | null;
}

/** Fallback when Shiprocket countries API is unavailable. India first. */
export const FALLBACK_SHIPPING_COUNTRIES: ShippingCountry[] = [
  { name: 'India', isoCode: 'IN', dialCode: '+91', postcodeRequired: true, postalRegex: '/^(\\d{6})$/' },
  { name: 'United States', isoCode: 'US', dialCode: '+1', postcodeRequired: true, postalRegex: '/^(\\d{5})(-\\d{4})?$/' },
  { name: 'United Kingdom', isoCode: 'GB', dialCode: '+44', postcodeRequired: true, postalRegex: '/^[A-Z]{1,2}\\d[A-Z\\d]?\\s*\\d[A-Z]{2}$/i' },
  { name: 'Canada', isoCode: 'CA', dialCode: '+1', postcodeRequired: true, postalRegex: '/^[A-Z]\\d[A-Z]\\s*\\d[A-Z]\\d$/i' },
  { name: 'Australia', isoCode: 'AU', dialCode: '+61', postcodeRequired: true, postalRegex: '/^(\\d{4})$/' },
  { name: 'United Arab Emirates', isoCode: 'AE', dialCode: '+971', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'Singapore', isoCode: 'SG', dialCode: '+65', postcodeRequired: true, postalRegex: '/^(\\d{6})$/' },
  { name: 'Germany', isoCode: 'DE', dialCode: '+49', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'France', isoCode: 'FR', dialCode: '+33', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'Italy', isoCode: 'IT', dialCode: '+39', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'Spain', isoCode: 'ES', dialCode: '+34', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'Netherlands', isoCode: 'NL', dialCode: '+31', postcodeRequired: true, postalRegex: '/^\\d{4}\\s?[A-Z]{2}$/i' },
  { name: 'Saudi Arabia', isoCode: 'SA', dialCode: '+966', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'Qatar', isoCode: 'QA', dialCode: '+974', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'Kuwait', isoCode: 'KW', dialCode: '+965', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'Malaysia', isoCode: 'MY', dialCode: '+60', postcodeRequired: true, postalRegex: '/^(\\d{5})$/' },
  { name: 'Japan', isoCode: 'JP', dialCode: '+81', postcodeRequired: true, postalRegex: '/^\\d{3}-?\\d{4}$/' },
  { name: 'New Zealand', isoCode: 'NZ', dialCode: '+64', postcodeRequired: true, postalRegex: '/^(\\d{4})$/' },
  { name: 'South Africa', isoCode: 'ZA', dialCode: '+27', postcodeRequired: true, postalRegex: '/^(\\d{4})$/' },
  { name: 'Brazil', isoCode: 'BR', dialCode: '+55', postcodeRequired: true, postalRegex: '/^\\d{5}-?\\d{3}$/' },
];

const FALLBACK_POSTAL: Record<string, RegExp> = {
  IN: /^\d{6}$/,
  US: /^\d{5}([-\s]?\d{4})?$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
  CA: /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ]\s?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i,
  AU: /^\d{4}$/,
  AE: /^\d{5}$/,
  SG: /^\d{6}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
};

export function findCountryByIso(
  countries: ShippingCountry[],
  isoCode: string,
): ShippingCountry | undefined {
  const code = isoCode.trim().toUpperCase();
  return countries.find((c) => c.isoCode === code);
}

export function findCountryByName(
  countries: ShippingCountry[],
  name: string,
): ShippingCountry | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;
  return countries.find(
    (c) =>
      c.name.toLowerCase() === normalized ||
      c.isoCode.toLowerCase() === normalized ||
      (normalized === 'bharat' && c.isoCode === 'IN'),
  );
}

export function isIndiaCountry(country?: string, countryCode?: string): boolean {
  const code = (countryCode || '').trim().toUpperCase();
  if (code === 'IN') return true;
  const normalized = (country || '').trim().toLowerCase();
  return normalized === 'india' || normalized === 'in' || normalized === 'bharat';
}

function compilePostalRegex(raw: string | null | undefined): RegExp | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^\/(.+)\/([a-z]*)$/i);
  try {
    if (match) return new RegExp(match[1], match[2]);
    return new RegExp(trimmed);
  } catch {
    return null;
  }
}

export function getPostalValidation(
  country: ShippingCountry | undefined,
): { pattern: RegExp; example: string; message: string } {
  const iso = country?.isoCode || 'IN';
  const fromApi = compilePostalRegex(country?.postalRegex);
  const pattern = fromApi || FALLBACK_POSTAL[iso] || /^[\w\s-]{2,16}$/;

  return {
    pattern,
    example: '',
    message: 'Enter a valid postal code',
  };
}

export function isValidPostalCode(
  postalCode: string,
  country: ShippingCountry | undefined,
): boolean {
  const value = postalCode.trim();
  if (!value) return false;
  const { pattern } = getPostalValidation(country);
  return pattern.test(value);
}

export function normalizeNationalPhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function buildCheckoutPhone(
  nationalPhone: string,
  country: ShippingCountry | undefined,
): string {
  const digits = normalizeNationalPhone(nationalPhone);
  if (!country || country.isoCode === 'IN') return digits;
  const dial = country.dialCode.replace(/[^\d+]/g, '') || '';
  const dialDigits = dial.replace(/\D/g, '');
  if (digits.startsWith(dialDigits)) return `+${digits}`;
  return `${dial.startsWith('+') ? dial : `+${dialDigits}`}${digits}`;
}

export function formatDeliveryEstimate(estimatedDays: string): string {
  const trimmed = estimatedDays.trim();
  if (!trimmed) return '3–5 Business Days';
  if (/business/i.test(trimmed)) return trimmed;
  if (/^\d+-\d+$/.test(trimmed)) return `${trimmed.replace('-', '–')} Business Days`;
  if (/^\d+$/.test(trimmed)) return `${trimmed} Business Days`;
  return trimmed;
}
