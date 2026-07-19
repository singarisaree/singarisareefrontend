import { PolicyPage } from '@/components/pages/policy-page';
import { STORE_CONTACT } from '@/lib/store-contact';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage title="Privacy Policy" lastUpdated="July 1, 2025">
      <p>At Singari Sarees, we respect your privacy and are committed to protecting your personal information.</p>
      <h2>Information We Collect</h2>
      <p>We collect information you provide during checkout: name, email, phone number, and shipping address. We do not require account creation.</p>
      <h2>How We Use Your Information</h2>
      <p>Your information is used solely for order processing, shipping, and communication regarding your purchase. We do not sell or share your data with third parties except as necessary for order fulfillment.</p>
      <h2>Data Security</h2>
      <p>We implement industry-standard security measures to protect your personal information. Payment processing is handled securely through Razorpay Payment Gateway.</p>
      <h2>Cookies</h2>
      <p>We use essential cookies for cart functionality and site performance. No tracking cookies are used without consent.</p>
      <h2>Contact</h2>
      <p>For privacy-related inquiries, contact us at {STORE_CONTACT.email}</p>
    </PolicyPage>
  );
}
