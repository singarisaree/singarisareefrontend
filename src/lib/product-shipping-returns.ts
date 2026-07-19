/**
 * Static Shipping & Returns copy shown on every product detail page.
 * Keep this aligned with /shipping-policy and /refund-policy when those change.
 */
export const PRODUCT_SHIPPING_RETURNS = {
  deliveryTitle: 'DELIVERY',
  deliveryPoints: [
    'Dispatch: Within 24 Hours',
    'We have free shipping across India. Terms and conditions apply.',
    'Delivery time - 7-10 business days',
  ],
  returnsTitle: 'RETURNS',
  returnsParagraphs: [
    'Return accepted within 3 days of delivery. You may return selected products from an order.',
    'Approved returns receive a store credit coupon (not cash) after shipping deductions. Use the coupon on future orders with the same mobile number until the credit balance is used up.',
  ],
  shippingPolicyHref: '/shipping-policy',
  returnsPolicyHref: '/refund-policy',
} as const;
