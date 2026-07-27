'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const hideNavbar = isAdmin || pathname.startsWith('/order') || pathname.startsWith('/showcase');
  /** Full-viewport lock only for immersive routes — not admin (needs page scroll). */
  const lockMainScroll = pathname.startsWith('/showcase');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main
        className={`min-w-0 overflow-x-hidden${lockMainScroll ? ' h-[100dvh] overflow-hidden' : ''}`}
      >
        {children}
      </main>
    </>
  );
}
