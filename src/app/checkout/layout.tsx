import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://checkout.razorpay.com" />
      <link rel="preconnect" href="https://api.razorpay.com" />
      <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
      <link rel="dns-prefetch" href="https://api.razorpay.com" />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      {children}
    </>
  );
}
