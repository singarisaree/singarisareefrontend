'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const hideNavbar = isAdmin || pathname.startsWith('/order');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className="min-w-0 overflow-x-hidden">{children}</main>
    </>
  );
}
