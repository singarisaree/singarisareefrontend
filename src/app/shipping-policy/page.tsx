import { PolicyPage } from '@/components/pages/policy-page';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Shipping Policy' };

export default function ShippingPolicyPage() {
  return (
    <PolicyPage title="Shipping Policy" lastUpdated="July 1, 2025">
      <h2>Domestic Shipping</h2>
      <p>We ship across India through trusted courier partners. Standard delivery takes 5-7 business days. Express delivery (2-3 days) is available for select pin codes.</p>
      <h2>Shipping Charges</h2>
      <p>Standard shipping is Rs. 99 for orders below Rs. 2,999. Free shipping on orders above Rs. 2,999.</p>
      <h2>International Shipping</h2>
      <p>We ship internationally to select countries. International orders typically take 10-15 business days. Customs duties and taxes are the responsibility of the recipient.</p>
      <h2>Order Tracking</h2>
      <p>Once shipped, you will receive tracking information via WhatsApp. You can also view updates on the My Orders page after logging in with your mobile number.</p>
      <h2>Failed Delivery &amp; Re-shipment</h2>
      <p>
        If delivery fails because of incorrect contact details, an unreachable phone number, or other
        communication issues, we will attempt to resend your order after you share updated
        details. Re-delivery may take longer than our standard timeline. Cash refunds are not
        provided for failed delivery; any credit issued will be a store coupon after applicable
        shipping deductions.
      </p>
      <h2>Packaging</h2>
      <p>Every saree is carefully packaged in premium boxes with protective wrapping to ensure it reaches you in perfect condition.</p>
    </PolicyPage>
  );
}
