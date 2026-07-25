/** Standard failed-payment copy for shoppers. */
export const PAYMENT_FAILED_MESSAGE =
  'The bank could not complete this payment. If any amount was debited, it will be auto-refunded within 5 to 7 working days.';

/** Pending payment copy — bank/UPI confirmation still in progress. */
export const PAYMENT_PENDING_MESSAGE =
  'Your payment is being confirmed with the bank. This usually takes a few seconds. Please wait — do not pay again.';

/** Turn Razorpay / bank error text into clear shopper copy. */
export function formatPaymentFailureMessage(_reason?: string | null): string {
  void _reason;
  return PAYMENT_FAILED_MESSAGE;
}
