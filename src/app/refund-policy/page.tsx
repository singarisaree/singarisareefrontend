import { PolicyPage } from '@/components/pages/policy-page';
import { STORE_CONTACT } from '@/lib/store-contact';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Returns & Exchange Policy' };

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Returns & Exchange Policy" lastUpdated="July 13, 2026">
      <h2>Returns</h2>
      <p>
        Returns are accepted within <strong>3 days of delivery</strong> for verified damage or
        quality issues. You may return one or more products from an order. Clear photos of the
        product are required when you submit a return request.
      </p>
      <h2>No cash refunds</h2>
      <p>
        We do not process cash or bank refunds for cancellations, returns, or RTO (return to
        origin). Approved cases receive a <strong>store credit coupon</strong> instead.
      </p>
      <h2>Store credit coupon</h2>
      <p>
        After we complete your return, cancellation, or RTO review, our team issues a coupon for
        the eligible product amount after shipping deductions. That coupon is linked to the mobile
        number used on the original order. You can apply it on future orders with that same shipping
        contact number until the store credit balance is fully used.
      </p>
      <h2>Shipping deductions</h2>
      <p>
        Shipping and related handling charges may be deducted from the store credit amount.
        The final coupon value is confirmed by our team before the coupon is issued.
      </p>
      <h2>Damaged products</h2>
      <p>
        If you receive a damaged product, contact us at{' '}
        <a href={`mailto:${STORE_CONTACT.email}`} className="text-maroon underline">
          {STORE_CONTACT.email}
        </a>{' '}
        or call{' '}
        <a href={`tel:${STORE_CONTACT.phone.replace(/\s/g, '')}`} className="text-maroon underline">
          {STORE_CONTACT.phone}
        </a>{' '}
        within 48 hours of delivery with clear photos or videos. Our team will verify the issue
        before arranging a return or store credit.
      </p>
      <h2>Failed delivery / RTO</h2>
      <p>
        If delivery fails (RTO) due to an incorrect phone number, unreachable contact, or other
        communication issues on the customer&apos;s side, any credit issued will be a store coupon
        after applicable shipping deductions — not a cash refund.
      </p>
      <h2>Support Hours</h2>
      <p>{STORE_CONTACT.hours}</p>
    </PolicyPage>
  );
}
