export type PaymentResultOutcome = 'success' | 'failed' | 'pending';

export function orderPaymentResultHref(
  orderId: string,
  outcome: PaymentResultOutcome,
): string {
  const id = encodeURIComponent(orderId);
  if (outcome === 'success') return `/order/success?order_id=${id}`;
  if (outcome === 'failed') return `/order/failed?order_id=${id}`;
  return `/order/pending?order_id=${id}`;
}
