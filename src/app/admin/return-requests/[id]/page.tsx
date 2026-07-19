'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminReturnRequestService } from '@/services/admin.service';
import {
  formatDate,
  formatDateTime,
  formatPrice,
  formatShortOrderNumber,
  getReturnRequestStatusLabel,
} from '@/lib/utils';
import { StatusBadge, returnRequestStatusVariant } from '@/components/admin/status-badge';
import { OrderTrackingTimeline } from '@/components/orders/order-tracking-timeline';
import {
  AdminDetailAside,
  AdminDetailEmpty,
  AdminDetailGrid,
  AdminDetailInfo,
  AdminDetailInfoGrid,
  AdminDetailLoading,
  AdminDetailMain,
  AdminDetailSection,
  AdminDetailShell,
  AdminFormTextarea,
} from '@/components/admin/admin-detail';
import type { ReturnRequestStatus } from '@/types';

type StatusAction = {
  status: ReturnRequestStatus;
  label: string;
  className: string;
};

function getStatusActions(status: ReturnRequestStatus): StatusAction[] {
  switch (status) {
    case 'REQUESTED':
      return [
        { status: 'ACCEPTED', label: 'Accept Return', className: 'bg-emerald-600 hover:bg-emerald-700' },
        { status: 'REJECTED', label: 'Reject Return', className: 'bg-red-600 hover:bg-red-700' },
      ];
    case 'ACCEPTED':
      return [
        {
          status: 'OUT_FOR_PICKUP',
          label: 'Mark Out for Pickup',
          className: 'bg-[#0f172a] hover:bg-[#1e293b]',
        },
      ];
    case 'OUT_FOR_PICKUP':
      return [
        { status: 'PICKED_UP', label: 'Mark Pickuped', className: 'bg-violet-600 hover:bg-violet-700' },
        {
          status: 'PICKUP_CANCELLED',
          label: 'Cancel Pickup',
          className: 'bg-orange-600 hover:bg-orange-700',
        },
      ];
    case 'PICKUP_CANCELLED':
      return [
        {
          status: 'OUT_FOR_PICKUP',
          label: 'Reschedule Pickup',
          className: 'bg-[#0f172a] hover:bg-[#1e293b]',
        },
      ];
    case 'PICKED_UP':
      return [
        { status: 'RETURNED', label: 'Mark Returned', className: 'bg-emerald-600 hover:bg-emerald-700' },
      ];
    default:
      return [];
  }
}

export default function AdminReturnRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState('');

  const { data: request, isLoading } = useQuery({
    queryKey: ['admin-return-request', id],
    queryFn: () => adminReturnRequestService.getById(id),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (request?.adminNotes) setAdminNotes(request.adminNotes);
  }, [request?.adminNotes, request?.id]);

  const updateMutation = useMutation({
    mutationFn: (payload: { status: ReturnRequestStatus; adminNotes?: string }) =>
      adminReturnRequestService.updateStatus(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-return-request', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['admin-return-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-order', updated.orderId] });
      toast.success(`Return ${getReturnRequestStatusLabel(updated.status).toLowerCase()}`);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update return request'),
  });

  if (isLoading) return <AdminDetailLoading />;
  if (!request) return <AdminDetailEmpty message="Return request not found" />;

  const statusActions = getStatusActions(request.status);
  const statusLabel = getReturnRequestStatusLabel(request.status);
  const trackingOrder = {
    status: request.order?.status || 'DELIVERED',
    trackingHistory: request.order?.shipping?.deliveredAt
      ? [
          {
            id: 'delivered',
            status: 'DELIVERED',
            timestamp: request.order.shipping.deliveredAt,
            description: 'Order delivered',
          },
        ]
      : [],
    returnRequests: [request],
  };

  return (
    <AdminDetailShell
      title="Return Request"
      subtitle={
        request.order
          ? `Order ${formatShortOrderNumber(request.order.orderNumber)} · Requested ${formatDateTime(request.createdAt)}`
          : `Requested ${formatDateTime(request.createdAt)}`
      }
      backHref="/admin/return-requests"
      backLabel="Back to Return Requests"
      badge={
        <span className="ml-4 text-lg font-medium">
          <span className="text-[#64748b]">Status : </span>
          <span
            style={{
              color:
                request.status === 'REJECTED' || request.status === 'PICKUP_CANCELLED'
                  ? '#dc2626'
                  : request.status === 'RETURNED' || request.status === 'ACCEPTED'
                    ? '#16a34a'
                    : '#ca8a04',
            }}
          >
            {statusLabel}
          </span>
        </span>
      }
    >
      <AdminDetailGrid>
        <AdminDetailMain>
          <AdminDetailSection title="Request Details" description="Customer return information">
            <AdminDetailInfoGrid>
              <AdminDetailInfo
                label="Status"
                value={
                  <StatusBadge variant={returnRequestStatusVariant(request.status)}>
                    {statusLabel}
                  </StatusBadge>
                }
              />
              <AdminDetailInfo label="Requested On" value={formatDate(request.createdAt)} />
              <AdminDetailInfo label="Customer Phone" value={request.customerPhone} />
              {request.refundCouponCode ? (
                <AdminDetailInfo label="Store Credit Coupon" value={request.refundCouponCode} />
              ) : null}
            </AdminDetailInfoGrid>
            <div className="mt-4">
              <AdminDetailInfo label="Reason" value={request.reason} />
            </div>
            {request.items && request.items.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
                  Returned Items
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[#0f172a]">
                  {request.items.map((item) => (
                    <li key={item.id}>
                      {item.orderItem?.productName ?? 'Item'}
                      {item.orderItem?.colorName ? ` · ${item.orderItem.colorName}` : ''}
                      {' × '}
                      {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {request.adminNotes ? (
              <div className="mt-4">
                <AdminDetailInfo label="Saved Admin Notes" value={request.adminNotes} />
              </div>
            ) : null}
          </AdminDetailSection>

          <AdminDetailSection
            title="Return Tracking"
            description="Continues from delivery through return progress"
          >
            <OrderTrackingTimeline
              order={trackingOrder}
              returnRequest={request}
              continueFromDelivered
              variant="admin"
            />
          </AdminDetailSection>

          {request.images.length > 0 && (
            <AdminDetailSection title="Uploaded Images" description="Photos submitted with the return">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {request.images.map((img) => (
                  <a
                    key={img.id}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]"
                  >
                    <Image src={img.url} alt="Return" fill sizes="10rem" className="object-cover" />
                  </a>
                ))}
              </div>
            </AdminDetailSection>
          )}
        </AdminDetailMain>

        <AdminDetailAside>
          {request.order && (
            <AdminDetailSection title="Order Summary">
              <div className="space-y-3 text-sm">
                <AdminDetailInfo
                  label="Order Number"
                  value={
                    <Link
                      href={`/admin/orders/${request.order.id}`}
                      className="font-mono font-bold text-[#0f172a] hover:underline"
                    >
                      {formatShortOrderNumber(request.order.orderNumber)}
                    </Link>
                  }
                />
                <AdminDetailInfo label="Customer" value={request.order.customerName} />
                <AdminDetailInfo label="Order Total" value={formatPrice(request.order.grandTotal)} />
                <AdminDetailInfo label="Order Date" value={formatDate(request.order.createdAt)} />
              </div>
            </AdminDetailSection>
          )}

          {statusActions.length > 0 && (
            <AdminDetailSection title="Update Return" description="Advance this return request">
              <div className="space-y-4">
                <AdminFormTextarea
                  label="Admin Notes (optional)"
                  value={adminNotes}
                  onChange={setAdminNotes}
                  rows={4}
                />
                <div className="flex flex-col gap-2">
                  {statusActions.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          status: action.status,
                          adminNotes: adminNotes || undefined,
                        })
                      }
                      className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${action.className}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </AdminDetailSection>
          )}
        </AdminDetailAside>
      </AdminDetailGrid>
    </AdminDetailShell>
  );
}
