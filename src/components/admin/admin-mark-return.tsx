'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { adminReturnRequestService } from '@/services/admin.service';
import { getApiErrorMessage } from '@/lib/api-error';
import { getReturnableQuantities, isInternationalOrder } from '@/lib/order-return';
import { formatPrice } from '@/lib/utils';
import {
  AdminDetailSection,
  AdminFormTextarea,
} from '@/components/admin/admin-detail';
import type { Order } from '@/types';

type Props = {
  order: Order;
};

export function AdminMarkReturnSection({ order }: Props) {
  const queryClient = useQueryClient();
  const returnable = useMemo(() => getReturnableQuantities(order), [order]);
  const hasReturnable = Object.values(returnable).some((qty) => qty > 0);
  const hasExistingReturn = (order.returnRequests ?? []).length > 0;
  const canMark =
    (order.status === 'DELIVERED' || order.status === 'RETURNED') &&
    !isInternationalOrder(order) &&
    !hasExistingReturn &&
    hasReturnable;

  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Damaged / customer contacted admin');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    setQtys((prev) => {
      const next: Record<string, number> = {};
      for (const item of order.items) {
        const max = returnable[item.id] ?? 0;
        next[item.id] = Math.min(prev[item.id] ?? 0, max);
      }
      return next;
    });
  }, [order.items, returnable]);

  const selectedItems = useMemo(
    () =>
      Object.entries(qtys)
        .filter(([, qty]) => qty > 0)
        .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
    [qtys],
  );

  const mutation = useMutation({
    mutationFn: () =>
      adminReturnRequestService.adminCreate({
        orderId: order.id,
        reason: reason.trim() || 'Admin marked return',
        items: selectedItems,
        adminNotes: adminNotes.trim() || undefined,
        initialStatus: 'RETURNED',
        force: false,
      }),
    onSuccess: () => {
      toast.success('Marked as returned');
      setQtys((prev) => {
        const next = { ...prev };
        for (const item of selectedItems) next[item.orderItemId] = 0;
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ['admin-order', order.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Could not mark return'));
    },
  });

  if (!canMark) return null;

  const setQty = (itemId: string, next: number) => {
    const max = returnable[itemId] ?? 0;
    setQtys((prev) => ({ ...prev, [itemId]: Math.max(0, Math.min(max, next)) }));
  };

  return (
    <AdminDetailSection title="Mark return">
      <div className="space-y-4">
        <div className="space-y-3">
          {order.items.map((item) => {
            const max = returnable[item.id] ?? 0;
            if (max <= 0) return null;
            const qty = qtys[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md bg-[#f8fafc] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#0f172a]">{item.productName}</p>
                  <p className="text-xs text-[#94a3b8]">
                    {item.colorName} · up to {max} · {formatPrice(Number(item.unitPrice))} each
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={qty <= 0 || mutation.isPending}
                    onClick={() => setQty(item.id, qty - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#e2e8f0] text-[#0f172a] disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                  <button
                    type="button"
                    disabled={qty >= max || mutation.isPending}
                    onClick={() => setQty(item.id, qty + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#e2e8f0] text-[#0f172a] disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <AdminFormTextarea label="Reason" value={reason} onChange={setReason} rows={2} />
        <AdminFormTextarea
          label="Admin notes (optional)"
          value={adminNotes}
          onChange={setAdminNotes}
          rows={2}
        />

        <button
          type="button"
          disabled={selectedItems.length === 0 || mutation.isPending || reason.trim().length < 5}
          onClick={() => mutation.mutate()}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : 'Mark selected as returned'}
        </button>
      </div>
    </AdminDetailSection>
  );
}
