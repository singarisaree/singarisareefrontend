import { PolicyPage } from '@/components/pages/policy-page';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Data Deletion Request' };

export default function DataDeletionPage() {
  return (
    <PolicyPage title="Data Deletion Request" lastUpdated="July 20, 2026">
      <p>
        If you would like us to delete your personal data, please email us at{' '}
        <a href="mailto:support@singarisarees.com" className="text-maroon hover:underline">
          support@singarisarees.com
        </a>{' '}
        with your registered phone number and order details. We will process your request in
        accordance with applicable laws and respond within a reasonable timeframe.
      </p>
    </PolicyPage>
  );
}
