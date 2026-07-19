'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <Navbar />}
      <main>{children}</main>
    </>
  );
}
