import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Order payment',
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-cream">{children}</div>;
}
