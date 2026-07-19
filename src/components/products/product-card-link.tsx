'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

interface ProductCardLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export function ProductCardLink({ href, className, children }: ProductCardLinkProps) {
  const router = useRouter();

  const warmRoute = () => {
    router.prefetch(href);
  };

  return (
    <Link
      href={href}
      prefetch
      className={className}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      onTouchStart={warmRoute}
    >
      {children}
    </Link>
  );
}
