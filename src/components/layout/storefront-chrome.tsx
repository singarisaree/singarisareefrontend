'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const hideNavbar = isAdmin || pathname.startsWith('/order') || pathname.startsWith('/showcase');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={`min-w-0 overflow-x-hidden${hideNavbar ? ' h-[100dvh] overflow-hidden' : ''}`}>{children}</main>
    </>
  );
}
