import { orderService } from '@/services/store.service';
import { formatShortOrderNumber } from '@/lib/utils';

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
    animation?: boolean;
  };
  retry?: { enabled: boolean; max_count?: number };
  remember_customer?: boolean;
  timeout?: number;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const RAZORPAY_SDK_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let loadPromise: Promise<void> | null = null;

export type OpenRazorpayCheckoutInput = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency?: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onVerifying?: () => void;
  onSuccess?: () => void | Promise<void>;
  onDismiss?: () => void;
  onFailed?: (reason?: string) => void;
};

export type RazorpayPayResult =
  | { status: 'paid' }
  | { status: 'verify_pending' }
  | { status: 'dismissed' }
  | { status: 'failed'; reason?: string };

/** Start loading Razorpay SDK early — safe to call multiple times. */
export function preloadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-sdk]');
    if (existing) {
      if (window.Razorpay) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load payment SDK')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SDK_URL;
    script.async = true;
    script.dataset.razorpaySdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load payment SDK'));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}

function normalizePhone(phone?: string) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits || undefined;
}

/**
 * Opens Razorpay Checkout and resolves as soon as Razorpay reports an outcome.
 * Payment verification runs in the background so navigation is not blocked.
 */
export async function openRazorpayCheckout(
  input: OpenRazorpayCheckoutInput,
): Promise<RazorpayPayResult> {
  await preloadRazorpayScript();

  const RazorpayCtor = window.Razorpay;
  if (!RazorpayCtor) throw new Error('Payment SDK failed to load');

  const key = input.keyId?.trim() || '';
  if (!key) throw new Error('Razorpay key is not configured');

  return new Promise<RazorpayPayResult>((resolve) => {
    let settled = false;

    const finish = (result: RazorpayPayResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const rzp = new RazorpayCtor({
      key,
      amount: input.amount,
      currency: input.currency || 'INR',
      name: 'Singari Sarees',
      description: `Order ${formatShortOrderNumber(input.orderNumber)}`,
      order_id: input.razorpayOrderId,
      prefill: {
        name: input.customerName,
        email: input.customerEmail,
        contact: normalizePhone(input.customerPhone),
      },
      notes: {
        orderNumber: input.orderNumber,
        shortOrderId: formatShortOrderNumber(input.orderNumber),
      },
      theme: { color: '#C4A35A' },
      retry: { enabled: false },
      remember_customer: false,
      modal: {
        animation: false,
        confirm_close: false,
        ondismiss: () => {
          if (settled) return;
          input.onDismiss?.();
          finish({ status: 'dismissed' });
        },
      },
      handler: (response) => {
        if (settled) return;
        settled = true;
        input.onVerifying?.();

        // Navigate immediately; status pages confirm via polling.
        void orderService
          .verifyPayment({
            orderNumber: input.orderNumber,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
          .then(() => input.onSuccess?.())
          .catch(() => undefined);

        finish({ status: 'paid' });
      },
    });

    rzp.on('payment.failed', (response) => {
      if (settled) return;
      const reason = response?.error?.description;
      input.onFailed?.(reason);
      finish({ status: 'failed', reason });
    });

    rzp.open();
  });
}

export {};
