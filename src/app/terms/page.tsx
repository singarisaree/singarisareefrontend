import { PolicyPage } from '@/components/pages/policy-page';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of Service" lastUpdated="July 1, 2025">
      <p>By using the Singari Sarees website, you agree to these terms of service.</p>
      <h2>Products</h2>
      <p>All products are subject to availability. We strive to display accurate colors and descriptions, though slight variations may occur due to the handcrafted nature of our sarees.</p>
      <h2>Pricing</h2>
      <p>All prices are in Indian Rupees (INR). We reserve the right to modify prices without prior notice.</p>
      <h2>Orders</h2>
      <p>Placing an order constitutes an offer to purchase. We reserve the right to cancel orders in case of pricing errors, stock unavailability, or suspected fraud.</p>
      <h2>Returns, Exchanges &amp; Refunds</h2>
      <p>
        Returns are accepted within 3 days of delivery for verified issues. You may return selected
        products from an order. We do not offer cash refunds for cancellations, returns, or RTO.
        Approved cases receive a store credit coupon after shipping deductions, linked to the order
        mobile number and usable on future orders with the same number until the credit balance is
        used up.
      </p>
      <h2>Intellectual Property</h2>
      <p>All content on this website, including images, text, and design, is the property of Singari Sarees and protected by copyright law.</p>
    </PolicyPage>
  );
}
