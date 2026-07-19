'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { adminOrderService } from '@/services/admin.service';
import { cn } from '@/lib/utils';

type ViewDetailsButtonProps = {
  href: string;
  label?: string;
  /** Prefetch admin order detail before navigation for instant open */
  prefetchOrderId?: string;
  className?: string;
};

export function ViewDetailsButton({
  href,
  label = 'Order Details',
  prefetchOrderId,
  className,
}: ViewDetailsButtonProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const prefetch = () => {
    router.prefetch(href);
    if (!prefetchOrderId) return;
    void queryClient.prefetchQuery({
      queryKey: ['admin-order', prefetchOrderId],
      queryFn: ({ signal }) => adminOrderService.getById(prefetchOrderId, signal),
      staleTime: 60_000,
    });
  };

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      onMouseDown={prefetch}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-bold text-[#0f172a] transition-colors hover:text-[#334155]',
        className,
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
