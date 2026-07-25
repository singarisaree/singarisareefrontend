export type PaymentResultOutcome = 'success' | 'failed' | 'pending';

export function orderPaymentResultHref(
  orderId: string,
  outcome: PaymentResultOutcome,
  options?: { verified?: boolean },
): string {
  const id = encodeURIComponent(orderId);
  if (outcome === 'success') {
    const verified = options?.verified ? '&verified=1' : '';
    return `/order/success?order_id=${id}${verified}`;
  }
  if (outcome === 'failed') return `/order/failed?order_id=${id}`;
  return `/order/pending?order_id=${id}`;
}
