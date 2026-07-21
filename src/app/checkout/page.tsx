'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useShallow } from 'zustand/react/shallow';
import { Tag, MapPin, Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Zap, Truck, Check } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckoutSkeleton } from '@/components/storefront/page-skeletons';
import { Footer } from '@/components/layout/footer';
import { CountrySelect } from '@/components/checkout/country-select';
import { useCartStore } from '@/stores/cart-store';
import { orderService } from '@/services/store.service';
import { formatPrice, formatColorLabel, formatCouponDiscountLabel } from '@/lib/utils';
import {
  calculateShippingCharge,
  isAddressReadyForShippingQuote,
  isHyderabadDeliveryArea,
  isIndiaShippingAddress,
} from '@/lib/shipping';
import {
  FALLBACK_SHIPPING_COUNTRIES,
  buildCheckoutPhone,
  findCountryByIso,
  findCountryByName,
  formatDeliveryEstimate,
  getPostalValidation,
  isIndiaCountry,
  isValidPostalCode,
  normalizeNationalPhone,
  type ShippingCountry,
} from '@/lib/countries';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useCartHydrated } from '@/hooks/use-cart-hydrated';
import { useCartSync } from '@/hooks/use-cart-sync';
import { useCouponSync } from '@/hooks/use-coupon-sync';
import { detectUserAddress, getLocationErrorMessage } from '@/lib/detect-location';
import { openRazorpayCheckout, preloadRazorpayScript } from '@/lib/razorpay-checkout';
import {
  PaymentStatusOverlay,
  type PaymentOverlayPhase,
} from '@/components/orders/payment-status-overlay';
import { useCustomerAuth } from '@/components/customer-auth-provider';

const checkoutSchema = z
  .object({
    customerName: z.string().min(2, 'Name is required'),
    customerPhone: z.string().min(8, 'Phone is required'),
    customerEmail: z.string().email('Enter valid email'),
    country: z.string().min(2),
    countryCode: z.string().length(2),
    state: z.string().min(2, 'State is required'),
    city: z.string().min(2, 'City is required'),
    postalCode: z.string().min(2, 'Postal code is required'),
    addressLine1: z.string().min(1, 'Door No is required'),
    addressLine2: z.string().min(2, 'Street / Area is required'),
    landmark: z.string().min(2, 'District / Locality is required'),
  })
  .superRefine((data, ctx) => {
    if (isIndiaCountry(data.country, data.countryCode)) {
      if (!/^[6-9]\d{9}$/.test(normalizeNationalPhone(data.customerPhone))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customerPhone'],
          message: 'Enter valid 10-digit mobile number',
        });
      }
    } else if (!/^\d{6,15}$/.test(normalizeNationalPhone(data.customerPhone))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerPhone'],
        message: 'Enter a valid phone number',
      });
    }
  });

type CheckoutForm = z.infer<typeof checkoutSchema>;

const CHECKOUT_DRAFT_KEY = 'singari-checkout-draft';

type CheckoutDraft = Partial<CheckoutForm> & {
  deliveryCoordinates?: { latitude: number; longitude: number } | null;
  preferredShipping?: 'QUICK' | 'STANDARD';
  instantDeliveryAvailable?: boolean;
};

function readCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return null;
  }
}

function writeCheckoutDraft(draft: CheckoutDraft) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

function clearCheckoutDraft() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

const checkoutFieldOrder: (keyof CheckoutForm)[] = [
  'customerName',
  'customerPhone',
  'customerEmail',
  'addressLine1',
  'addressLine2',
  'city',
  'landmark',
  'state',
  'country',
  'postalCode',
];

function focusCheckoutField(field: keyof CheckoutForm) {
  const el = document.getElementById(field);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.requestAnimationFrame(() => {
    if (el instanceof HTMLElement) {
      el.focus({ preventScroll: true });
    }
  });
}

function parseQuickEtaDurationMs(eta: string | null | undefined): number | null {
  if (eta == null || !String(eta).trim()) return null;
  const raw = String(eta).trim();

  if (/^\d+$/.test(raw)) {
    const mins = Number(raw);
    return Number.isFinite(mins) && mins > 0 ? mins * 60_000 : null;
  }

  const aboutHours = raw.match(/about\s+(\d+(?:\.\d+)?)\s+hours?/i);
  if (aboutHours) {
    const hours = Number(aboutHours[1]);
    return Number.isFinite(hours) && hours > 0 ? hours * 3_600_000 : null;
  }

  const aboutMins = raw.match(/about\s+(\d+)\s+minutes?/i);
  if (aboutMins) {
    const mins = Number(aboutMins[1]);
    return Number.isFinite(mins) && mins > 0 ? mins * 60_000 : null;
  }

  const plainHours = raw.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i);
  if (plainHours) {
    const hours = Number(plainHours[1]);
    return Number.isFinite(hours) && hours > 0 ? hours * 3_600_000 : null;
  }

  return null;
}

/** Instant ETA like Standard: “Arrives by 4:52 PM”. */
function formatQuickEta(etaMinutes: string | null | undefined): string {
  const durationMs = parseQuickEtaDurationMs(etaMinutes);
  if (durationMs != null) {
    const arriveAt = new Date(Date.now() + durationMs);
    const time = arriveAt.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `Arrives by ${time}`;
  }

  if (etaMinutes == null || !String(etaMinutes).trim()) return 'Arrives today';
  const raw = String(etaMinutes).trim();
  if (/^arrives\b/i.test(raw)) return raw;
  // Date-only strings from Shiprocket (e.g. “Jul 15, 2026”)
  if (/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}$/.test(raw)) {
    const today = new Date();
    const sameDay =
      raw.toLowerCase() ===
      today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return sameDay ? 'Arrives today' : `Arrives ${raw}`;
  }
  return `Arrives in ${raw}`;
}

function getFirstInvalidCheckoutField(
  fieldErrors: FieldErrors<CheckoutForm>,
): keyof CheckoutForm | undefined {
  return checkoutFieldOrder.find((field) => fieldErrors[field]);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { customer, isLoading: authLoading } = useCustomerAuth();
  const { items, couponCode, couponDiscount, isRefundCoupon, setCoupon, updateQuantity, removeItem } = useCartStore(
    useShallow((s) => ({
      items: s.items,
      couponCode: s.couponCode,
      couponDiscount: s.couponDiscount,
      isRefundCoupon: s.isRefundCoupon,
      setCoupon: s.setCoupon,
      updateQuantity: s.updateQuantity,
      removeItem: s.removeItem,
    })),
  );
  const subtotal = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  const cartHydrated = useCartHydrated();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentOverlayPhase>(null);
  const clearCart = useCartStore((s) => s.clearCart);
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [hasDetectedLocation, setHasDetectedLocation] = useState(false);
  const [instantDeliveryAvailable, setInstantDeliveryAvailable] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [preferredShipping, setPreferredShipping] = useState<'QUICK' | 'STANDARD'>('STANDARD');
  const [standardShippingCharge, setStandardShippingCharge] = useState(() =>
    calculateShippingCharge(subtotal),
  );
  const [quickQuote, setQuickQuote] = useState<{
    rate: number;
    etaMinutes: string | null;
    courierName: string | null;
  } | null>(null);
  const [quickQuoteStatus, setQuickQuoteStatus] = useState<
    'idle' | 'loading' | 'ready' | 'unavailable'
  >('idle');
  const [quickUnavailableMessage, setQuickUnavailableMessage] = useState<string | null>(null);
  const [shippingCharge, setShippingCharge] = useState(() => calculateShippingCharge(subtotal));
  const [shippingMessage, setShippingMessage] = useState('India domestic shipping rules apply.');
  const [shippingStatus, setShippingStatus] = useState<
    'idle' | 'loading' | 'ready' | 'unavailable' | 'error'
  >('idle');
  const [countries, setCountries] = useState<ShippingCountry[]>(FALLBACK_SHIPPING_COUNTRIES);
  const shippingRequestId = useRef(0);
  const quickRequestId = useRef(0);
  /** Skip clearing detection while Detect My Location is writing form fields. */
  const applyingDetectedAddressRef = useRef(false);

  useCartSync();
  const settings = usePublicSettings();
  const isLoggedIn = Boolean(customer);

  useEffect(() => {
    void preloadRazorpayScript();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void orderService
      .getShippingCountries()
      .then((rows) => {
        if (cancelled || !rows?.length) return;
        setCountries(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            isoCode: row.isoCode,
            dialCode: row.dialCode,
            postcodeRequired: row.postcodeRequired,
            postalRegex: row.postalRegex,
          })),
        );
      })
      .catch(() => {
        /* keep fallback list */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkoutDraft = useMemo(() => {
    const draft = readCheckoutDraft();
    if (!draft) return null;
    const {
      deliveryCoordinates: _coords,
      preferredShipping: _pref,
      instantDeliveryAvailable: _inst,
      ...formFields
    } = draft;
    return formFields;
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    setFocus,
    clearErrors,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      country: 'India',
      countryCode: 'IN',
      ...(checkoutDraft || {}),
    },
  });

  const draftRestoredRef = useRef(false);

  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    const draft = readCheckoutDraft();
    if (!draft) return;

    (Object.keys(draft) as Array<keyof CheckoutDraft>).forEach((key) => {
      if (
        key === 'deliveryCoordinates' ||
        key === 'preferredShipping' ||
        key === 'instantDeliveryAvailable'
      ) {
        return;
      }
      const value = draft[key];
      if (typeof value === 'string' && value.trim()) {
        setValue(key, value, { shouldValidate: false });
      }
    });

    if (draft.deliveryCoordinates) {
      setDeliveryCoordinates(draft.deliveryCoordinates);
      setHasDetectedLocation(true);
    }
    if (draft.instantDeliveryAvailable) {
      setInstantDeliveryAvailable(true);
    }
    if (draft.preferredShipping === 'QUICK' || draft.preferredShipping === 'STANDARD') {
      setPreferredShipping(draft.preferredShipping);
    }
  }, [setValue]);

  useEffect(() => {
    if (!customer?.phone) return;
    const phone = customer.phone.replace(/\D/g, '').slice(-10);
    if (phone) {
      setValue('customerPhone', phone, { shouldValidate: true });
    }
    // Keep draft/typed name & email; only fill empty fields from login profile
    const current = getValues();
    if (!current.customerName?.trim() && customer.name?.trim()) {
      setValue('customerName', customer.name.trim(), { shouldValidate: true });
    }
    if (!current.customerEmail?.trim() && customer.email?.trim()) {
      setValue('customerEmail', customer.email.trim(), { shouldValidate: true });
    }
  }, [customer, getValues, setValue]);

  const watchedCountry = watch('country');
  const watchedCountryCode = watch('countryCode');
  const watchedPostalCode = watch('postalCode');
  const watchedCity = watch('city');
  const watchedState = watch('state');
  const watchedAddressLine1 = watch('addressLine1');
  const watchedAddressLine2 = watch('addressLine2');
  const watchedLandmark = watch('landmark');
  const watchedCustomerPhone = watch('customerPhone');
  const watchedCustomerName = watch('customerName');
  const watchedCustomerEmail = watch('customerEmail');
  const grandTotal = Math.round((subtotal - couponDiscount + shippingCharge) * 100) / 100;

  const clearDetectedLocation = useCallback(() => {
    if (applyingDetectedAddressRef.current) return;
    if (!hasDetectedLocation && !deliveryCoordinates) return;
    setHasDetectedLocation(false);
    setDeliveryCoordinates(null);
    setInstantDeliveryAvailable(false);
    setQuickQuote(null);
    setQuickQuoteStatus('idle');
    setQuickUnavailableMessage(null);
    setPreferredShipping('STANDARD');
    setLocationError(null);
    toast.info('Location detection removed. Detect again or enter address manually.');
  }, [hasDetectedLocation, deliveryCoordinates]);

  /** City / locality / state / country / pin — editing clears Detect My Location. */
  const registerLocationLockedField = (name: keyof CheckoutForm) => {
    const registration = register(name);
    return {
      ...registration,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        void registration.onChange(event);
        if (hasDetectedLocation || deliveryCoordinates) {
          clearDetectedLocation();
        }
      },
    };
  };

  // Keep checkout form across login redirect
  useEffect(() => {
    writeCheckoutDraft({
      customerName: watchedCustomerName,
      customerPhone: watchedCustomerPhone,
      customerEmail: watchedCustomerEmail,
      country: watchedCountry,
      countryCode: watchedCountryCode,
      state: watchedState,
      city: watchedCity,
      postalCode: watchedPostalCode,
      addressLine1: watchedAddressLine1,
      addressLine2: watchedAddressLine2,
      landmark: watchedLandmark,
      deliveryCoordinates,
      preferredShipping,
      instantDeliveryAvailable,
    });
  }, [
    watchedCustomerName,
    watchedCustomerPhone,
    watchedCustomerEmail,
    watchedCountry,
    watchedCountryCode,
    watchedState,
    watchedCity,
    watchedPostalCode,
    watchedAddressLine1,
    watchedAddressLine2,
    watchedLandmark,
    deliveryCoordinates,
    preferredShipping,
    instantDeliveryAvailable,
  ]);

  useCouponSync(watchedCustomerPhone, shippingCharge);

  const selectedCountry = useMemo(
    () =>
      findCountryByIso(countries, watchedCountryCode || 'IN') ||
      findCountryByName(countries, watchedCountry || 'India') ||
      FALLBACK_SHIPPING_COUNTRIES[0],
    [countries, watchedCountry, watchedCountryCode],
  );

  const postalValidation = useMemo(
    () => getPostalValidation(selectedCountry),
    [selectedCountry],
  );

  const postalValid = useMemo(
    () => isValidPostalCode(watchedPostalCode || '', selectedCountry),
    [watchedPostalCode, selectedCountry],
  );

  const isIndia = isIndiaShippingAddress(watchedCountry, watchedPostalCode, watchedCountryCode);
  const shippingReady = shippingStatus === 'ready';
  const canProceedToPayment =
    shippingReady &&
    isAddressReadyForShippingQuote({
      country: watchedCountry,
      countryCode: watchedCountryCode,
      state: watchedState,
      city: watchedCity,
      postalCode: watchedPostalCode,
      postalValid,
    });

  useEffect(() => {
    setCouponInput(couponCode || '');
  }, [couponCode]);

  const clearShippingQuote = useCallback(() => {
    setShippingCharge(0);
    setShippingStatus('idle');
    setShippingMessage('Enter a complete address to calculate shipping.');
  }, []);

  useEffect(() => {
    if (isIndia) {
      const charge = calculateShippingCharge(subtotal, settings);
      setStandardShippingCharge(charge);
      setShippingStatus('ready');
      return;
    }

    if (
      !isAddressReadyForShippingQuote({
        country: watchedCountry,
        countryCode: watchedCountryCode,
        state: watchedState,
        city: watchedCity,
        postalCode: watchedPostalCode,
        postalValid,
      })
    ) {
      clearShippingQuote();
      if (watchedPostalCode && !postalValid) {
        setShippingMessage(postalValidation.message);
        setShippingStatus('error');
      }
      return;
    }

    const requestId = ++shippingRequestId.current;
    setShippingStatus('loading');
    setShippingCharge(0);
    setShippingMessage('Calculating shipping…');

    const timeoutId = window.setTimeout(async () => {
      try {
        const quote = await orderService.quoteShipping(
          items.map((i) => ({
            productId: i.productId,
            productColorId: i.productColorId,
            quantity: i.quantity,
          })),
          {
            country: watchedCountry,
            countryCode: watchedCountryCode,
            state: watchedState,
            city: watchedCity,
            postalCode: watchedPostalCode,
            addressLine1: watchedAddressLine1,
            addressLine2: watchedAddressLine2,
            landmark: watchedLandmark,
          },
        );

        if (requestId !== shippingRequestId.current) return;

        if (!quote.success) {
          setShippingCharge(0);
          setShippingStatus('unavailable');
          setShippingMessage(quote.message || 'Delivery is not available for this location.');
          return;
        }

        setShippingCharge(Number(quote.shippingFee) || 0);
        const etaRaw = String(quote.estimatedDays || '').trim();
        const etaLabel = etaRaw
          ? `Expected · ${formatDeliveryEstimate(etaRaw)}`
          : null;
        setShippingMessage(
          etaLabel
            ? quote.courier
              ? `${etaLabel} via ${quote.courier}`
              : etaLabel
            : quote.courier
              ? `Lowest available fare via ${quote.courier}.`
              : 'Lowest available international fare from Shiprocket X.',
        );
        setShippingStatus('ready');
      } catch {
        if (requestId !== shippingRequestId.current) return;
        setShippingCharge(0);
        setShippingStatus('error');
        setShippingMessage('Unable to calculate shipping right now. Please try again.');
      }
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [
    isIndia,
    watchedCountry,
    watchedCountryCode,
    watchedPostalCode,
    watchedCity,
    watchedState,
    watchedAddressLine1,
    watchedAddressLine2,
    watchedLandmark,
    postalValid,
    postalValidation.message,
    items,
    subtotal,
    settings,
    clearShippingQuote,
  ]);

  // Sync India shipping charge when Instant vs Standard selection changes
  useEffect(() => {
    if (!isIndia || shippingStatus !== 'ready') return;
    if (preferredShipping === 'QUICK' && quickQuote) {
      setShippingCharge(quickQuote.rate);
      setShippingMessage(`Instant · ${formatQuickEta(quickQuote.etaMinutes)}`);
      return;
    }
    setShippingCharge(standardShippingCharge);
    // Hyderabad Standard is always 2-day delivery; other India cities are 3–7 days
    if (
      quickQuote ||
      isHyderabadDeliveryArea({
        city: watchedCity,
        postalCode: watchedPostalCode,
        landmark: watchedLandmark,
        state: watchedState,
      })
    ) {
      setShippingMessage('Standard · Arrives in 2 days');
      return;
    }
    setShippingMessage('Standard · Expected in 3–7 days');
  }, [
    isIndia,
    preferredShipping,
    quickQuote,
    standardShippingCharge,
    settings,
    shippingStatus,
    watchedCity,
    watchedPostalCode,
    watchedLandmark,
    watchedState,
  ]);

  // Quote Shiprocket Quick when location is Hyderabad + coords exist
  useEffect(() => {
    if (
      !isIndia ||
      !instantDeliveryAvailable ||
      !deliveryCoordinates ||
      items.length === 0
    ) {
      setQuickQuote(null);
      setQuickQuoteStatus('idle');
      setQuickUnavailableMessage(null);
      setPreferredShipping((prev) => (prev === 'QUICK' ? 'STANDARD' : prev));
      return;
    }

    const requestId = ++quickRequestId.current;
    setQuickQuoteStatus('loading');
    setQuickUnavailableMessage(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await orderService.quoteQuick(
          items.map((i) => ({
            productId: i.productId,
            productColorId: i.productColorId,
            quantity: i.quantity,
          })),
          {
            latitude: deliveryCoordinates.latitude,
            longitude: deliveryCoordinates.longitude,
            postalCode: watchedPostalCode || undefined,
            city: watchedCity || undefined,
          },
        );

        if (requestId !== quickRequestId.current) return;

        if (result.available && result.rate != null && Number.isFinite(Number(result.rate))) {
          setQuickQuote({
            rate: Number(result.rate),
            etaMinutes: result.etaMinutes ?? null,
            courierName: result.courierName ?? null,
          });
          setQuickQuoteStatus('ready');
          setQuickUnavailableMessage(null);
          setPreferredShipping('QUICK');
        } else {
          setQuickQuote(null);
          setQuickQuoteStatus('unavailable');
          setQuickUnavailableMessage(
            result.message ||
              'Instant delivery is not available right now. You can continue with Standard delivery.',
          );
          setPreferredShipping('STANDARD');
        }
      } catch {
        if (requestId !== quickRequestId.current) return;
        setQuickQuote(null);
        setQuickQuoteStatus('unavailable');
        setQuickUnavailableMessage(
          'Instant delivery is not available right now. You can continue with Standard delivery.',
        );
        setPreferredShipping('STANDARD');
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    isIndia,
    instantDeliveryAvailable,
    deliveryCoordinates,
    items,
    watchedPostalCode,
    watchedCity,
  ]);

  const handleApplyCoupon = async (code?: string) => {
    const targetCode = (code || couponInput || '').trim().toUpperCase();
    if (!targetCode) return;
    setIsApplyingCoupon(true);
    try {
      const result = await orderService.validateCoupon(
        targetCode,
        subtotal,
        watchedCustomerPhone || undefined,
        shippingCharge,
      );
      setCoupon(
        targetCode,
        result.discount,
        Boolean(result.isRefundCoupon ?? result.coupon?.isRefundCoupon),
      );
      setCouponInput(targetCode);
      toast.quick(
        result.isRefundCoupon || result.coupon?.isRefundCoupon
          ? `Refund coupon applied! You save ${formatPrice(result.discount)}`
          : `Coupon applied! You save ${formatPrice(result.discount)}`,
      );
    } catch (error) {
      toast.error(
        isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Coupon not valid for this order',
      );
      setCoupon(null, 0);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const onSubmit = async (data: CheckoutForm) => {
    if (!canProceedToPayment) {
      toast.error(
        shippingStatus === 'unavailable'
          ? 'Delivery is not available for this location.'
          : 'Please wait for a valid shipping quote before payment.',
      );
      return;
    }

    if (!isLoggedIn) {
      writeCheckoutDraft({
        ...data,
        deliveryCoordinates,
      });
      toast.info('Please login to continue');
      router.push('/login?next=/checkout');
      return;
    }

    if (!isValidPostalCode(data.postalCode, selectedCountry)) {
      toast.error(postalValidation.message);
      focusCheckoutField('postalCode');
      return;
    }

    setIsSubmitting(true);
    const needsGateway = grandTotal > 0;
    setPaymentPhase(needsGateway ? 'creating' : 'placing');
    if (needsGateway) {
      void preloadRazorpayScript();
    }
    try {
      const phone = buildCheckoutPhone(data.customerPhone, selectedCountry);
      const result = await orderService.checkout({
        customerName: data.customerName,
        customerPhone: phone,
        customerEmail: data.customerEmail,
        shippingAddress: {
          country: data.country,
          countryCode: data.countryCode,
          state: data.state,
          city: data.city,
          postalCode: data.postalCode,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          landmark: data.landmark,
          ...(deliveryCoordinates
            ? {
                latitude: deliveryCoordinates.latitude,
                longitude: deliveryCoordinates.longitude,
              }
            : {}),
          preferredShipping:
            preferredShipping === 'QUICK' && quickQuote ? 'QUICK' : 'STANDARD',
        },
        items: items.map((i) => ({
          productId: i.productId,
          productColorId: i.productColorId,
          quantity: i.quantity,
        })),
        couponCode: couponCode || undefined,
      });

      const orderNumber = result.order?.orderNumber;
      if (!orderNumber) {
        throw new Error('Order was not created');
      }

      if (result.paymentRequired === false) {
        setPaymentPhase('placing');
        clearCheckoutDraft();
        clearCart();
        router.replace(`/order/success?order_id=${encodeURIComponent(orderNumber)}`);
        return;
      }

      if (!result.razorpayOrderId || !result.keyId) {
        throw new Error('Payment session was not created');
      }

      setPaymentPhase('checkout');
      const payResult = await openRazorpayCheckout({
        keyId: result.keyId,
        razorpayOrderId: result.razorpayOrderId,
        amount: result.amount,
        currency: result.currency,
        orderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: phone,
        onVerifying: () => setPaymentPhase('verifying'),
      });

      if (payResult.status === 'paid') {
        setPaymentPhase('verifying');
        clearCheckoutDraft();
        clearCart();
        router.replace(`/order/success?order_id=${encodeURIComponent(orderNumber)}`);
        return;
      }

      setPaymentPhase(null);
      setIsSubmitting(false);

      if (payResult.status === 'failed') {
        toast.error(payResult.reason || 'Payment was not completed. You can try again.');
        router.replace(`/order/pending?order_id=${encodeURIComponent(orderNumber)}`);
        return;
      }

      toast.info('Payment window closed. Your order is reserved — complete payment anytime.');
      router.replace(`/order/pending?order_id=${encodeURIComponent(orderNumber)}`);
    } catch (error) {
      setPaymentPhase(null);
      const message =
        isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Checkout failed. Please try again.';
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  const handleDetectLocation = async () => {
    setLocationError(null);
    setIsLocating(true);
    applyingDetectedAddressRef.current = true;
    try {
      const detected = await detectUserAddress();

      if (detected.city) setValue('city', detected.city, { shouldValidate: true });
      if (detected.state) setValue('state', detected.state, { shouldValidate: true });
      if (detected.postalCode) setValue('postalCode', detected.postalCode, { shouldValidate: true });
      if (detected.country) {
        const matched =
          findCountryByName(countries, detected.country) ||
          findCountryByIso(countries, detected.country);
        if (matched) {
          setValue('country', matched.name, { shouldValidate: true });
          setValue('countryCode', matched.isoCode, { shouldValidate: true });
        } else {
          setValue('country', detected.country, { shouldValidate: true });
        }
      }
      if (detected.landmark) setValue('landmark', detected.landmark, { shouldValidate: true });
      if (detected.addressLine2) setValue('addressLine2', detected.addressLine2, { shouldValidate: true });
      if (detected.addressLine1) setValue('addressLine1', detected.addressLine1, { shouldValidate: true });

      const addressFilled = [
        detected.city,
        detected.state,
        detected.postalCode,
        detected.country,
        detected.landmark,
        detected.addressLine2,
        detected.addressLine1,
      ].some(Boolean);

      setHasDetectedLocation(addressFilled);
      setInstantDeliveryAvailable(detected.isHyderabad);
      setDeliveryCoordinates({
        latitude: detected.latitude,
        longitude: detected.longitude,
      });
      if (!detected.isHyderabad) {
        setQuickQuote(null);
        setQuickQuoteStatus('idle');
        setPreferredShipping('STANDARD');
      }

      if (addressFilled) {
        toast.quick(
          detected.isHyderabad
            ? 'Location detected. Checking Instant delivery…'
            : 'Address detected. You can edit Door No and Street / Area only.',
        );
      } else {
        setLocationError('Could not read a full address from your location. Please fill the fields manually.');
        setHasDetectedLocation(false);
        setInstantDeliveryAvailable(false);
        setDeliveryCoordinates(null);
        setQuickQuote(null);
        setPreferredShipping('STANDARD');
      }
    } catch (error) {
      setHasDetectedLocation(false);
      setInstantDeliveryAvailable(false);
      setDeliveryCoordinates(null);
      setQuickQuote(null);
      setQuickQuoteStatus('idle');
      setPreferredShipping('STANDARD');
      setLocationError(getLocationErrorMessage(error));
    } finally {
      applyingDetectedAddressRef.current = false;
      setIsLocating(false);
    }
  };

  const handleCheckoutValidationError = useCallback(
    (fieldErrors: FieldErrors<CheckoutForm>) => {
      const firstInvalid = getFirstInvalidCheckoutField(fieldErrors);
      if (firstInvalid) {
        setFocus(firstInvalid);
        focusCheckoutField(firstInvalid);
        const message = fieldErrors[firstInvalid]?.message;
        toast.error(
          typeof message === 'string' ? message : 'Please complete all required fields correctly.',
        );
        return;
      }
      toast.error('Please complete all required fields correctly.');
    },
    [setFocus],
  );

  if (!cartHydrated) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0 && paymentPhase) {
    return <PaymentStatusOverlay phase={paymentPhase} />;
  }

  if (items.length === 0) {
    return (
      <>
        <div className="mx-auto box-border flex min-h-[50vh] w-full max-w-7xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <ShoppingBag className="h-16 w-16 text-gold/40" strokeWidth={1.25} aria-hidden />
          <h1 className="mt-6 font-serif text-3xl text-charcoal">Your cart is empty</h1>
          <p className="mt-2 max-w-md text-brown-light">
            Browse our collections and add sarees you love — they&apos;ll appear here.
          </p>
          <Link href="/collections" className="mt-8">
            <Button variant="gold" size="lg">
              Shop Collections
            </Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="mx-auto box-border w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl text-charcoal">Checkout</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-maroon transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>

        <form
          onSubmit={handleSubmit(onSubmit, handleCheckoutValidationError)}
          className="mt-8 grid w-full min-w-0 max-w-full gap-6 sm:gap-8 lg:grid-cols-2"
        >
              <section className="luxury-card h-fit w-full min-w-0 max-w-full p-4 sm:p-6 lg:sticky lg:top-24">
                <h2 className="font-serif text-lg">Products</h2>
                <div className="mt-4 space-y-4">
                  {items.map((item) => (
                    <article
                      key={item.productColorId}
                      className="flex min-w-0 gap-3 border-b border-gold/10 pb-4 last:border-0 last:pb-0 sm:gap-4"
                    >
                      <Link href={`/product/${item.slug}`} className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-beige">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            sizes="5rem"
                            className="object-cover"
                          />
                        ) : null}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div className="min-w-0">
                          <Link
                            href={`/product/${item.slug}`}
                            className="break-words font-serif text-charcoal hover:text-gold"
                          >
                            {item.productName}
                          </Link>
                          <p className="text-sm text-brown-light">
                            Color: {formatColorLabel(item.colorName)}
                          </p>
                          <p className="mt-1 text-sm font-medium">{formatPrice(item.price)}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                          <div className="flex shrink-0 items-center rounded-md border border-gold/30">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productColorId, item.quantity - 1)}
                              className="p-1.5"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productColorId, item.quantity + 1)}
                              className="p-1.5"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                            <span className="whitespace-nowrap text-sm font-medium">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(item.productColorId)}
                              className="text-red-600 hover:text-red-700"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="min-w-0 w-full max-w-full space-y-6">
                <section className="luxury-card w-full min-w-0 max-w-full p-4 sm:p-6">
                  <h2 className="font-serif text-lg">Contact Information</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="customerName">Full Name</Label>
                      <Input id="customerName" {...register('customerName')} aria-invalid={!!errors.customerName} />
                      {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">Phone Number</Label>
                      <div className="flex gap-2">
                        <div
                          className="flex h-10 shrink-0 items-center rounded-md border border-input bg-beige/40 px-3 text-sm text-charcoal"
                          aria-label="Phone country code"
                        >
                          {selectedCountry.dialCode || '+91'}
                        </div>
                        <Input
                          id="customerPhone"
                          className="flex-1"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder={isIndia ? '10-digit mobile' : 'Phone number'}
                          readOnly={isLoggedIn}
                          {...register('customerPhone')}
                        />
                      </div>
                      {isLoggedIn ? (
                        <p className="mt-1 text-xs text-brown-light">Using your login number</p>
                      ) : null}
                      {errors.customerPhone && (
                        <p className="mt-1 text-xs text-red-600">{errors.customerPhone.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email</Label>
                      <Input id="customerEmail" type="email" {...register('customerEmail')} />
                      {errors.customerEmail && <p className="mt-1 text-xs text-red-600">{errors.customerEmail.message}</p>}
                    </div>
                  </div>
                </section>

                <section className="luxury-card w-full min-w-0 max-w-full p-4 sm:p-6">
                  <h2 className="font-serif text-lg">Shipping Address</h2>

                  <div className="mt-4 rounded-lg border border-gold/25 bg-gold/5 p-4">
                    <p className="text-xs text-brown-light">
                      Use your current location to auto-fill the address
                    </p>
                    <Button
                      type="button"
                      variant="gold"
                      className="mt-4 w-full sm:w-auto"
                      onClick={() => void handleDetectLocation()}
                      disabled={isLocating}
                    >
                      <MapPin className={`mr-2 h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
                      {isLocating ? 'Finding your location...' : 'Detect My Location'}
                    </Button>
                    {hasDetectedLocation ? (
                      <div className="mt-2 rounded-md border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-2">
                        <p className="text-[11px] font-medium leading-snug text-emerald-900">
                          Location detected. You can edit Door No and Street / Area only.
                        </p>
                        {instantDeliveryAvailable && quickQuoteStatus === 'loading' ? (
                          <p className="mt-0.5 text-[10px] leading-snug text-emerald-800/80">
                            Checking Instant delivery availability…
                          </p>
                        ) : null}
                        {instantDeliveryAvailable && quickQuoteStatus === 'unavailable' ? (
                          <p className="mt-0.5 text-[10px] leading-snug text-emerald-800/80">
                            {quickUnavailableMessage ||
                              'Instant delivery is not available right now. You can continue with Standard delivery.'}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {locationError ? (
                      <p className="mt-2 text-[11px] leading-snug text-red-600">{locationError}</p>
                    ) : null}
                  </div>

                  {isIndia && quickQuoteStatus === 'ready' && quickQuote ? (
                    <div className="mt-5 space-y-2.5">
                      <div>
                        <h3 className="font-serif text-sm text-charcoal">How would you like it delivered?</h3>
                        <p className="mt-0.5 text-[11px] leading-snug text-brown-light">
                          Instant is available for your Hyderabad location.
                        </p>
                      </div>
                      <div
                        className="grid gap-2 sm:grid-cols-2"
                        role="radiogroup"
                        aria-label="Delivery option"
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={preferredShipping === 'QUICK'}
                          onClick={() => setPreferredShipping('QUICK')}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                            preferredShipping === 'QUICK'
                              ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(184,148,74,0.3)]'
                              : 'border-gold/20 bg-white hover:border-gold/40 hover:bg-beige/30'
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              preferredShipping === 'QUICK'
                                ? 'bg-gold/20 text-gold'
                                : 'bg-beige text-brown-light'
                            }`}
                          >
                            <Zap className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-semibold text-charcoal">Instant</span>
                              <span className="shrink-0 text-xs font-semibold text-charcoal">
                                {quickQuote.rate === 0 ? 'Free' : formatPrice(quickQuote.rate)}
                              </span>
                            </span>
                            <span className="mt-0.5 flex items-baseline justify-between gap-2">
                              <span className="truncate text-[10px] text-brown-light">
                                {formatQuickEta(quickQuote.etaMinutes)}
                              </span>
                              <span className="shrink-0 text-[10px] text-brown-light">Delivery fee</span>
                            </span>
                          </span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              preferredShipping === 'QUICK'
                                ? 'border-gold bg-gold text-white'
                                : 'border-gold/30 bg-white'
                            }`}
                            aria-hidden
                          >
                            {preferredShipping === 'QUICK' ? (
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            ) : null}
                          </span>
                        </button>

                        <button
                          type="button"
                          role="radio"
                          aria-checked={preferredShipping === 'STANDARD'}
                          onClick={() => setPreferredShipping('STANDARD')}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                            preferredShipping === 'STANDARD'
                              ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(184,148,74,0.3)]'
                              : 'border-gold/20 bg-white hover:border-gold/40 hover:bg-beige/30'
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              preferredShipping === 'STANDARD'
                                ? 'bg-gold/20 text-gold'
                                : 'bg-beige text-brown-light'
                            }`}
                          >
                            <Truck className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-semibold text-charcoal">Standard</span>
                              <span className="shrink-0 text-xs font-semibold text-charcoal">
                                {standardShippingCharge === 0
                                  ? 'Free'
                                  : formatPrice(standardShippingCharge)}
                              </span>
                            </span>
                            <span className="mt-0.5 flex items-baseline justify-between gap-2">
                              <span className="truncate text-[10px] text-brown-light">
                                Arrives in 2 days
                              </span>
                              <span className="shrink-0 text-[10px] text-brown-light">Delivery fee</span>
                            </span>
                          </span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              preferredShipping === 'STANDARD'
                                ? 'border-gold bg-gold text-white'
                                : 'border-gold/30 bg-white'
                            }`}
                            aria-hidden
                          >
                            {preferredShipping === 'STANDARD' ? (
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            ) : null}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gold/20" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-brown-light">OR</span>
                    <div className="h-px flex-1 bg-gold/20" />
                  </div>

                  <div>
                    <h3 className="font-serif text-base text-charcoal">Enter address manually</h3>
                    {hasDetectedLocation ? (
                      <p className="mt-1 text-[11px] leading-snug text-brown-light/90">
                        Edit Door No or Street / Area freely. Changing city, pin, state, country, or locality
                        removes location detection.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2" lang="en">
                    <div>
                      <Label htmlFor="addressLine1">Door No</Label>
                      <Input
                        id="addressLine1"
                        lang="en"
                        autoComplete="address-line1"
                        {...register('addressLine1')}
                      />
                      {errors.addressLine1 && <p className="mt-1 text-xs text-red-600">{errors.addressLine1.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="addressLine2">Street / Area</Label>
                      <Input
                        id="addressLine2"
                        lang="en"
                        autoComplete="address-line2"
                        {...register('addressLine2')}
                      />
                      {errors.addressLine2 && <p className="mt-1 text-xs text-red-600">{errors.addressLine2.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="city">City / Village</Label>
                      <Input
                        id="city"
                        lang="en"
                        autoComplete="address-level2"
                        {...registerLocationLockedField('city')}
                      />
                      {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="landmark">District / Locality</Label>
                      <Input
                        id="landmark"
                        lang="en"
                        {...registerLocationLockedField('landmark')}
                      />
                      {errors.landmark && <p className="mt-1 text-xs text-red-600">{errors.landmark.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="state">State / Province</Label>
                      <Input
                        id="state"
                        lang="en"
                        autoComplete="address-level1"
                        {...registerLocationLockedField('state')}
                      />
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <input type="hidden" {...register('country')} />
                      <input type="hidden" {...register('countryCode')} />
                      <CountrySelect
                        id="country"
                        countries={countries}
                        valueIso={watchedCountryCode || 'IN'}
                        onChange={(country) => {
                          if (hasDetectedLocation || deliveryCoordinates) {
                            clearDetectedLocation();
                          }
                          setValue('country', country.name, { shouldValidate: true, shouldDirty: true });
                          setValue('countryCode', country.isoCode, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          setValue('postalCode', '', { shouldValidate: false, shouldDirty: true });
                          clearErrors('postalCode');
                          clearShippingQuote();
                        }}
                      />
                      {errors.country && (
                        <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        lang="en"
                        autoComplete="postal-code"
                        {...registerLocationLockedField('postalCode')}
                      />
                      {errors.postalCode && (
                        <p className="mt-1 text-xs text-red-600">{errors.postalCode.message}</p>
                      )}
                      {!errors.postalCode && watchedPostalCode && !postalValid ? (
                        <p className="mt-1 text-xs text-red-600">{postalValidation.message}</p>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="luxury-card w-full min-w-0 max-w-full p-4 sm:p-6">
                  <h2 className="font-serif text-lg">Order Summary</h2>
                  <div className="mt-4 flex min-w-0 gap-2">
                    <Input
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      aria-label="Coupon code"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      variant="outline"
                      type="button"
                      className="shrink-0"
                      onClick={() => void handleApplyCoupon()}
                      disabled={isApplyingCoupon}
                    >
                      <Tag className="h-4 w-4" />
                      Apply
                    </Button>
                  </div>
                  {couponCode && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-gold/10 px-2 py-1.5 text-xs">
                      <p className="text-gold">
                        {isRefundCoupon ? 'Refund coupon' : 'Coupon'} {couponCode} applied
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCoupon(null, 0);
                          setCouponInput('');
                        }}
                        className="rounded border border-gold/30 px-2 py-0.5 font-medium text-charcoal hover:bg-beige"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex min-w-0 justify-between gap-3"><dt>Subtotal</dt><dd className="shrink-0">{formatPrice(subtotal)}</dd></div>
                    {couponDiscount > 0 && (
                      <div className="flex min-w-0 justify-between gap-3 text-gold">
                        <dt className="min-w-0">
                          {formatCouponDiscountLabel({
                            couponCode,
                            isRefundCoupon,
                          })}
                        </dt>
                        <dd className="shrink-0">-{formatPrice(couponDiscount)}</dd>
                      </div>
                    )}
                    <div className="flex min-w-0 justify-between gap-3">
                      <dt>{quickQuote ? 'Delivery fee' : 'Shipping'}</dt>
                      <dd className="shrink-0">
                        {shippingStatus === 'loading'
                          ? '…'
                          : shippingStatus === 'ready'
                            ? shippingCharge === 0
                              ? 'Free'
                              : formatPrice(shippingCharge)
                            : '—'}
                      </dd>
                    </div>
                    <div className="flex min-w-0 justify-between gap-3 border-t border-gold/20 pt-2 text-base font-medium">
                      <dt>Grand Total</dt><dd className="shrink-0">{formatPrice(grandTotal)}</dd>
                    </div>
                  </dl>
                  {(shippingStatus === 'unavailable' || shippingStatus === 'error') && (
                    <p className="mt-2 text-xs text-red-600">
                      {shippingStatus === 'unavailable'
                        ? 'Delivery is not available for this location.'
                        : shippingMessage}
                    </p>
                  )}
                  <Button
                    type="submit"
                    variant="gold"
                    size="lg"
                    className="mt-6 w-full"
                    disabled={isSubmitting || authLoading || !canProceedToPayment}
                  >
                    {isSubmitting
                      ? paymentPhase === 'placing'
                        ? 'Placing order…'
                        : paymentPhase === 'verifying'
                          ? 'Confirming order…'
                          : paymentPhase === 'checkout'
                            ? 'Complete payment…'
                            : 'Preparing order…'
                      : shippingStatus === 'unavailable'
                        ? 'Delivery unavailable'
                        : !isLoggedIn
                          ? grandTotal <= 0
                            ? 'Login & Place Order'
                            : 'Login & Proceed to Payment'
                          : grandTotal <= 0
                            ? 'Place Order'
                            : 'Proceed to Payment'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-maroon transition-colors hover:text-charcoal"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back
                  </button>
                </section>
              </div>
        </form>
      </div>
      <PaymentStatusOverlay phase={paymentPhase} />
      <Footer />
    </>
  );
}
