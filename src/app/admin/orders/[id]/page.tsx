'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { refreshAdminOrderLists } from '@/lib/refresh-admin-order-lists';
import { adminOrderService } from '@/services/admin.service';
import { formatPrice, formatDate, formatDateTime, formatShortOrderNumber, getOrderStatusLabel, getReturnRequestStatusLabel, formatPaymentMethodLabel, formatCouponDiscountLabel } from '@/lib/utils';
import {
  applyDeliveryTypeToAddress,
  getDeliveryTypeLabel,
  resolveDeliveryType,
  type DeliveryType,
} from '@/lib/delivery-type';
import type { Order, ShippingAddress, ShipmentHistoryRecord, ShipmentInfo } from '@/types';
import { StatusBadge, orderStatusVariant, returnRequestStatusVariant } from '@/components/admin/status-badge';
import { UnsavedGuard } from '@/components/admin/unsaved-guard';
import { OrderTrackingTimeline } from '@/components/orders/order-tracking-timeline';
import { OrderPaymentStatusNotice, shouldHideOrderTracking } from '@/components/orders/order-payment-status-notice';
import {
  AdminDetailAside,
  AdminDetailEmpty,
  AdminDetailGrid,
  AdminDetailInfo,
  AdminDetailLoading,
  AdminDetailMain,
  AdminDetailSaveBar,
  AdminDetailSection,
  AdminDetailShell,
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from '@/components/admin/admin-detail';

const STATUS_OPTIONS = [
  'PLACED', 'PAYMENT_PENDING', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT',
  'DELIVERED', 'RETURNED', 'REFUNDED', 'CANCELLED', 'FAILED', 'RTO',
];
/** READY_TO_SHIP is set only by Create Shipment (Shiprocket), not the status dropdown. */

/** Mirrors backend assertValidStatusTransition (READY_TO_SHIP excluded from manual set). */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  PAYMENT_PENDING: ['PLACED', 'FAILED', 'CANCELLED'],
  PLACED: ['CONFIRMED', 'CANCELLED', 'FAILED'],
  CONFIRMED: ['CANCELLED', 'RTO'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED', 'RTO'],
  SHIPPED: ['IN_TRANSIT', 'DELIVERED', 'RTO'],
  IN_TRANSIT: ['DELIVERED', 'RTO'],
  DELIVERED: ['RETURNED', 'REFUNDED'],
  RETURNED: ['REFUNDED'],
  RTO: ['CONFIRMED', 'CANCELLED', 'REFUNDED'],
  FAILED: ['PAYMENT_PENDING', 'CANCELLED'],
  CANCELLED: [],
  REFUNDED: [],
};

function allowedStatusOptions(currentStatus: string, draftStatus: string): string[] {
  const next = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
  const options = new Set<string>([currentStatus, ...next]);
  // Keep draft selection visible even if invalid (backend will reject on save)
  if (draftStatus) options.add(draftStatus);
  if (currentStatus === 'READY_TO_SHIP') options.add('READY_TO_SHIP');
  return STATUS_OPTIONS.filter((option) => options.has(option));
}

/** Orders list URL for a status tab; keeps filters from a previous returnTo when present. */
function ordersListHrefForStatus(orderStatus: string, preserveFrom?: string | null): string {
  const params = new URLSearchParams();
  if (orderStatus) params.set('status', orderStatus);
  if (preserveFrom) {
    try {
      const from = new URL(preserveFrom, 'http://local').searchParams;
      for (const key of ['q', 'deliveryType', 'startDate', 'endDate', 'page', 'limit']) {
        const value = from.get(key);
        if (value) params.set(key, value);
      }
    } catch {
      /* ignore invalid returnTo */
    }
  }
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : '/admin/orders';
}

function isSafeAdminReturnTo(value: string | null): value is string {
  return Boolean(value && value.startsWith('/admin/') && !value.startsWith('//'));
}

function isOrdersListReturnTo(value: string): boolean {
  return value === '/admin/orders' || value.startsWith('/admin/orders?');
}

const emptyAddress: ShippingAddress = {
  country: 'India',
  state: '',
  city: '',
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(emptyAddress);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [itemSpecs, setItemSpecs] = useState<
    Record<string, { weight: string; length: string; width: string; height: string }>
  >({});

  const { data: order, isLoading, isFetching, isPending } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: ({ signal }) => adminOrderService.getById(id, signal),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (order) {
      const address = order.shippingAddress as ShippingAddress;
      setCustomerName(order.customerName);
      setCustomerPhone(order.customerPhone);
      setCustomerEmail(order.customerEmail);
      setShippingAddress({
        country: address.country || 'India',
        state: address.state || '',
        city: address.city || '',
        postalCode: address.postalCode || '',
        addressLine1: address.addressLine1 || '',
        addressLine2: address.addressLine2 || '',
        landmark: address.landmark || '',
        ...(address.preferredShipping
          ? { preferredShipping: address.preferredShipping }
          : {}),
        ...(address.latitude != null && address.longitude != null
          ? { latitude: address.latitude, longitude: address.longitude }
          : {}),
      });
      setStatus(order.status);
      setNotes((order as Order & { notes?: string }).notes || '');
      const specs: Record<string, { weight: string; length: string; width: string; height: string }> = {};
      for (const item of order.items) {
        specs[item.id] = {
          weight: formatSpecValue(item.weight ?? item.product?.weight),
          length: formatSpecValue(item.length ?? item.product?.length),
          width: formatSpecValue(item.width ?? item.product?.width),
          height: formatSpecValue(item.height ?? item.product?.height),
        };
      }
      setItemSpecs(specs);
    }
  }, [order]);

  const save = useMutation({
    mutationFn: () => {
      if (!order) throw new Error('Order not loaded');
      const payload = buildOrderUpdatePayload({
        order,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        status,
        notes,
        itemSpecs,
      });
      if (Object.keys(payload).length === 0) {
        throw new Error('NO_CHANGES');
      }
      return adminOrderService.update(id, payload);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['admin-order', id] });
      const previous = queryClient.getQueryData<Order>(['admin-order', id]);
      if (previous) {
        queryClient.setQueryData<Order>(['admin-order', id], {
          ...previous,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          shippingAddress,
          status: status as Order['status'],
          notes: notes.trim() || undefined,
        });
      }
      return { previous };
    },
    onSuccess: (updated: Order) => {
      toast.success('Order updated');
      // Status-only confirm returns a light patch — merge onto cached order.
      queryClient.setQueryData(['admin-order', id], (prev: Order | undefined) =>
        prev ? { ...prev, ...updated } : updated,
      );
      refreshAdminOrderLists(queryClient, {
        ...(status !== 'READY_TO_SHIP' && { removeDispatchOrderId: id }),
      });

      const previousReturnTo = searchParams.get('returnTo');
      const cameFromOrdersList =
        !previousReturnTo ||
        (isSafeAdminReturnTo(previousReturnTo) && isOrdersListReturnTo(previousReturnTo));
      if (cameFromOrdersList && status && order && status !== order.status) {
        const nextReturnTo = ordersListHrefForStatus(status, previousReturnTo);
        router.replace(
          `/admin/orders/${id}?returnTo=${encodeURIComponent(nextReturnTo)}`,
          { scroll: false },
        );
      }
    },
    onError: (error, _vars, context) => {
      if (error instanceof Error && error.message === 'NO_CHANGES') {
        toast.info('No changes to save');
        return;
      }
      if (context?.previous) {
        queryClient.setQueryData(['admin-order', id], context.previous);
      }
      toast.error(getApiErrorMessage(error, 'Failed to update order'));
    },
  });

  const handleSave = () => {
    if (!order) return;
    const destructive = ['CANCELLED', 'REFUNDED', 'RTO', 'RETURNED', 'FAILED'];
    if (status !== order.status && destructive.includes(status)) {
      const ok = window.confirm(
        `Change order status to "${getOrderStatusLabel(status)}"? This can affect inventory and fulfillment.`,
      );
      if (!ok) return;
    }
    save.mutate();
  };

  const updateAddress = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const updateItemSpec = (
    itemId: string,
    field: 'weight' | 'length' | 'width' | 'height',
    value: string,
  ) => {
    setItemSpecs((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const totalOrderWeight = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => {
      const weight = parseSpecNumber(itemSpecs[item.id]?.weight);
      if (weight == null) return sum;
      return sum + weight * item.quantity;
    }, 0);
  }, [order, itemSpecs]);

  const totalOrderSize = useMemo(() => {
    if (!order) return { length: null, width: null, height: null };
    return computePackageDimensions(order.items, itemSpecs);
  }, [order, itemSpecs]);

  const hasChanges = useMemo(() => {
    if (!order) return false;
    const addr = order.shippingAddress as ShippingAddress;
    const baseChanged =
      customerName !== order.customerName ||
      customerPhone !== order.customerPhone ||
      customerEmail !== order.customerEmail ||
      status !== order.status ||
      notes !== ((order as Order & { notes?: string }).notes || '') ||
      JSON.stringify(shippingAddress) !== JSON.stringify({
        country: addr.country || 'India',
        state: addr.state || '',
        city: addr.city || '',
        postalCode: addr.postalCode || '',
        addressLine1: addr.addressLine1 || '',
        addressLine2: addr.addressLine2 || '',
        landmark: addr.landmark || '',
        ...(addr.preferredShipping
          ? { preferredShipping: addr.preferredShipping }
          : {}),
        ...(addr.latitude != null && addr.longitude != null
          ? { latitude: addr.latitude, longitude: addr.longitude }
          : {}),
      });

    const specsChanged = order.items.some((item) => {
      const current = itemSpecs[item.id];
      if (!current) return false;
      return (
        current.weight !== formatSpecValue(item.weight ?? item.product?.weight) ||
        current.length !== formatSpecValue(item.length ?? item.product?.length) ||
        current.width !== formatSpecValue(item.width ?? item.product?.width) ||
        current.height !== formatSpecValue(item.height ?? item.product?.height)
      );
    });

    return baseChanged || specsChanged;
  }, [order, customerName, customerPhone, customerEmail, status, notes, shippingAddress, itemSpecs]);

  if ((isLoading || isPending) && !order) return <AdminDetailLoading />;
  if (!order) return <AdminDetailEmpty message="Order not found" />;

  const returnTo = searchParams.get('returnTo');
  const backHref = (() => {
    // Dispatches / other admin surfaces keep their return path
    if (isSafeAdminReturnTo(returnTo) && !isOrdersListReturnTo(returnTo)) return returnTo;
    const effectiveStatus = status || order.status;
    // Any status change → follow that tab (not the old filter / All)
    if (effectiveStatus && effectiveStatus !== order.status) {
      return ordersListHrefForStatus(effectiveStatus, returnTo);
    }
    if (isSafeAdminReturnTo(returnTo) && isOrdersListReturnTo(returnTo)) return returnTo;
    return ordersListHrefForStatus(order.status, returnTo);
  })();
  const backLabel = backHref.startsWith('/admin/dispatches')
    ? 'Back to Dispatches'
    : 'Back to Orders';

  const payment = order.payments?.[0];
  const statusLabel = getOrderStatusLabel(status || order.status);
  const hideTracking = shouldHideOrderTracking(order);

  return (
    <>
    <UnsavedGuard hasChanges={hasChanges} />
    <AdminDetailShell
      backHref={backHref}
      backLabel={backLabel}
      title={`Order ${formatShortOrderNumber(order.orderNumber)}`}
      subtitle={`Placed ${formatDateTime(order.createdAt)}${isFetching ? ' · Refreshing' : ''}`}
      badge={
        <StatusBadge variant={orderStatusVariant(status || order.status)} className="text-xs">
          {statusLabel}
        </StatusBadge>
      }
      footer={
        <AdminDetailSaveBar onSave={handleSave} saving={save.isPending} />
      }
    >
      <AdminDetailGrid>
        <AdminDetailMain>
          <AdminDetailSection title="Order Items">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-xs uppercase tracking-wide text-[#94a3b8]">
                    <th className="pb-2 pr-3 font-medium">Product</th>
                    <th className="pb-2 pr-3 font-medium">Color</th>
                    <th className="pb-2 pr-3 font-medium">SKU</th>
                    <th className="pb-2 pr-3 font-medium">Price</th>
                    <th className="pb-2 pr-3 font-medium">Qty</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-3 font-medium text-[#0f172a]">{item.productName}</td>
                      <td className="py-3 pr-3 text-[#64748b]">{item.colorName}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-[#64748b]">{item.sku}</td>
                      <td className="py-3 pr-3 text-[#334155]">{formatPrice(Number(item.unitPrice))}</td>
                      <td className="py-3 pr-3 text-[#334155]">{item.quantity}</td>
                      <td className="py-3 text-right font-semibold text-[#0f172a]">
                        {formatPrice(Number(item.totalPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminDetailSection>

          <AdminDetailSection title="Package" description="Weight and size used for shipping">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-xs uppercase tracking-wide text-[#94a3b8]">
                    <th className="pb-2 pr-3 font-medium">Product</th>
                    <th className="pb-2 pr-3 font-medium">Qty</th>
                    <th className="pb-2 pr-3 font-medium">Weight (g)</th>
                    <th className="pb-2 pr-3 font-medium">L</th>
                    <th className="pb-2 pr-3 font-medium">W</th>
                    <th className="pb-2 font-medium">H</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {order.items.map((item) => {
                    const specs = itemSpecs[item.id] ?? { weight: '', length: '', width: '', height: '' };
                    return (
                      <tr key={item.id}>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-[#0f172a]">{item.productName}</p>
                          <p className="text-xs text-[#94a3b8]">{item.colorName}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-[#64748b]">{item.quantity}</td>
                        <td className="py-2.5 pr-3">
                          <SpecInput
                            value={specs.weight}
                            onChange={(value) => updateItemSpec(item.id, 'weight', value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <SpecInput
                            value={specs.length}
                            onChange={(value) => updateItemSpec(item.id, 'length', value)}
                            placeholder="L"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <SpecInput
                            value={specs.width}
                            onChange={(value) => updateItemSpec(item.id, 'width', value)}
                            placeholder="W"
                          />
                        </td>
                        <td className="py-2.5">
                          <SpecInput
                            value={specs.height}
                            onChange={(value) => updateItemSpec(item.id, 'height', value)}
                            placeholder="H"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                <span className="text-[#64748b]">Total weight </span>
                <span className="font-semibold text-[#0f172a]">
                  {totalOrderWeight > 0 ? `${formatWeight(totalOrderWeight)} g` : '—'}
                </span>
              </div>
              <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                <span className="text-[#64748b]">Package size </span>
                <span className="font-semibold text-[#0f172a]">{formatPackageSize(totalOrderSize)}</span>
              </div>
            </div>
          </AdminDetailSection>

          <AdminDetailSection title="Customer & Shipping">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AdminFormSelect
                  label="Delivery type"
                  value={resolveDeliveryType(shippingAddress)}
                  onChange={(value) =>
                    setShippingAddress((prev) =>
                      applyDeliveryTypeToAddress(prev, value as DeliveryType),
                    )
                  }
                >
                  <option value="INDIA">India</option>
                  <option value="INTERNATIONAL">International</option>
                  <option value="QUICK">Quick (Instant)</option>
                </AdminFormSelect>
                <p className="mt-1.5 text-xs text-[#64748b]">
                  Quick = fare charged at checkout only. Admin creates the Shiprocket Quick shipment later.
                  International needs a non-India country below.
                </p>
              </div>
              <AdminFormField label="Customer Name" value={customerName} onChange={setCustomerName} />
              <AdminFormField label="Phone Number" value={customerPhone} onChange={setCustomerPhone} />
              <AdminFormField label="Email" value={customerEmail} onChange={setCustomerEmail} type="email" />
              <AdminDetailInfo
                label={order.coupon?.isRefundCoupon ? 'Refund Coupon' : 'Coupon'}
                value={order.couponCode || 'None'}
              />
              <AdminFormField
                label="Door No"
                value={shippingAddress.addressLine1}
                onChange={(value) => updateAddress('addressLine1', value)}
              />
              <AdminFormField
                label="Street / Area"
                value={shippingAddress.addressLine2 || ''}
                onChange={(value) => updateAddress('addressLine2', value)}
              />
              <AdminFormField
                label="City / Village"
                value={shippingAddress.city}
                onChange={(value) => updateAddress('city', value)}
              />
              <AdminFormField
                label="District / Locality"
                value={shippingAddress.landmark || ''}
                onChange={(value) => updateAddress('landmark', value)}
              />
              <AdminFormField
                label="State"
                value={shippingAddress.state}
                onChange={(value) => updateAddress('state', value)}
              />
              <AdminFormField
                label="Country"
                value={shippingAddress.country}
                onChange={(value) => updateAddress('country', value)}
              />
              <AdminFormField
                label="Postal Code"
                value={shippingAddress.postalCode}
                onChange={(value) => updateAddress('postalCode', value)}
              />
            </div>
          </AdminDetailSection>

          {hideTracking ? (
            <AdminDetailSection title="Payment Status">
              <OrderPaymentStatusNotice order={order} variant="admin" />
            </AdminDetailSection>
          ) : (
            <AdminDetailSection title="Tracking">
              <OrderTrackingTimeline order={order} variant="admin" />
            </AdminDetailSection>
          )}
        </AdminDetailMain>

        <AdminDetailAside>
          <AdminDetailSection title="Payment">
            <div className="space-y-2.5 text-sm">
              <SummaryRow label="Subtotal" value={formatPrice(Number(order.subtotal))} />
              <SummaryRow
                label={
                  order.coupon?.isRefundCoupon
                    ? formatCouponDiscountLabel({
                        couponCode: order.couponCode,
                        isRefundCoupon: true,
                      })
                    : 'Discount'
                }
                value={formatPrice(Number(order.discountAmount))}
              />
              <SummaryRow label="Shipping" value={formatPrice(Number(order.shippingCharge))} />
              <SummaryRow
                label="Delivery type"
                value={getDeliveryTypeLabel(resolveDeliveryType(order.shippingAddress as ShippingAddress))}
              />
              <div className="border-t border-[#e2e8f0] pt-2.5">
                <SummaryRow label="Grand Total" value={formatPrice(Number(order.grandTotal))} bold />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">Status</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#0f172a]">
                    {order.status === 'REFUNDED' || order.refundCouponCode || order.refundedAt
                      ? 'Refunded'
                      : payment?.status || 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">Method</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#0f172a]">
                    {formatPaymentMethodLabel(payment, {
                      couponCode: order.couponCode,
                      grandTotal: order.grandTotal,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </AdminDetailSection>

          <AdminDetailSection title="Manage Order">
            <div className="space-y-3">
              <AdminFormSelect label="Order Status" value={status} onChange={setStatus}>
                {allowedStatusOptions(order.status, status).map((option) => (
                  <option key={option} value={option}>
                    {option === 'READY_TO_SHIP'
                      ? `${getOrderStatusLabel(option)} (Shiprocket only)`
                      : getOrderStatusLabel(option)}
                  </option>
                ))}
              </AdminFormSelect>
              {status === 'READY_TO_SHIP' && !order.shipping?.awbCode && (
                <p className="text-xs text-[#b91c1c]">
                  Ready to Ship without AWB. Create shipment from Confirmed, or wait for Shiprocket sync.
                </p>
              )}
              {status === 'READY_TO_SHIP' && order.shipping?.awbCode && (
                <p className="text-xs text-[#64748b]">
                  If cancelled in Shiprocket, the order returns to Confirmed automatically.
                </p>
              )}
              {status !== 'READY_TO_SHIP' && (
                <p className="text-xs text-[#64748b]">
                  Ready to Ship is set only when creating a Shiprocket shipment.
                </p>
              )}
              <AdminFormTextarea label="Admin Notes" value={notes} onChange={setNotes} rows={4} />
            </div>
          </AdminDetailSection>

          {(order.returnRequests?.length ?? 0) > 0 && (
            <AdminDetailSection title="Returns">
              <div className="space-y-2">
                {order.returnRequests!.map((returnRequest) => (
                  <div
                    key={returnRequest.id}
                    className="flex items-start justify-between gap-3 rounded-lg bg-[#f8fafc] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <StatusBadge variant={returnRequestStatusVariant(returnRequest.status)}>
                        {getReturnRequestStatusLabel(returnRequest.status)}
                      </StatusBadge>
                      <p className="mt-1.5 truncate text-sm text-[#334155]">{returnRequest.reason}</p>
                      <p className="mt-0.5 text-xs text-[#94a3b8]">{formatDate(returnRequest.createdAt)}</p>
                    </div>
                    <Link
                      href={`/admin/return-requests/${returnRequest.id}`}
                      className="shrink-0 text-xs font-bold text-[#0f172a] hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            </AdminDetailSection>
          )}

          <AdminDetailSection title="Shipment">
            <div className="space-y-4">
              {resolveDeliveryType(order.shippingAddress as ShippingAddress) === 'QUICK' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Customer chose Instant — create the Quick shipment when ready.
                </div>
              ) : null}
              <ShipmentCard
                title="Current"
                badge="Active"
                badgeVariant="active"
                shipment={order.shipping}
                emptyMessage="No shipment yet"
              />
              {order.shipping && (
                <ShipmentActions
                  orderId={order.id}
                  shipment={order.shipping}
                  onUpdated={() => {
                    void queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
                    refreshAdminOrderLists(queryClient);
                  }}
                  onCancelled={() => {
                    setStatus('CONFIRMED');
                    void queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
                    refreshAdminOrderLists(queryClient);
                  }}
                />
              )}
              {(order.shipmentHistory?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Previous
                  </p>
                  {order.shipmentHistory!.map((record, index) => (
                    <ShipmentCard
                      key={record.id}
                      title={`Shipment ${order.shipmentHistory!.length - index}`}
                      badge="Archived"
                      badgeVariant="inactive"
                      shipment={record}
                      archivedAt={record.archivedAt}
                      reason={record.reason}
                    />
                  ))}
                </div>
              )}
            </div>
          </AdminDetailSection>
        </AdminDetailAside>
      </AdminDetailGrid>
    </AdminDetailShell>
    </>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#64748b]">{label}</span>
      <span className={bold ? 'text-base font-semibold text-[#0f172a]' : 'font-medium text-[#0f172a]'}>{value}</span>
    </div>
  );
}

function sameNullableNumber(a: number | null | undefined, b: number | null | undefined) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

function normalizeAddressForCompare(address: ShippingAddress) {
  return {
    country: address.country || 'India',
    countryCode: address.countryCode || undefined,
    state: address.state || '',
    city: address.city || '',
    postalCode: address.postalCode || '',
    addressLine1: address.addressLine1 || '',
    addressLine2: address.addressLine2?.trim() || undefined,
    landmark: address.landmark?.trim() || undefined,
    ...(address.preferredShipping
      ? { preferredShipping: address.preferredShipping }
      : {}),
    ...(address.latitude != null && address.longitude != null
      ? { latitude: address.latitude, longitude: address.longitude }
      : {}),
  };
}

function buildOrderUpdatePayload({
  order,
  customerName,
  customerPhone,
  customerEmail,
  shippingAddress,
  status,
  notes,
  itemSpecs,
}: {
  order: Order;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
  status: string;
  notes: string;
  itemSpecs: Record<string, { weight: string; length: string; width: string; height: string }>;
}) {
  const payload: Record<string, unknown> = {};
  const nextName = customerName.trim();
  const nextPhone = customerPhone.trim();
  const nextEmail = customerEmail.trim();
  const nextNotes = notes.trim();
  const existingNotes = (order as Order & { notes?: string }).notes || '';

  if (nextName !== order.customerName) payload.customerName = nextName;
  if (nextPhone !== order.customerPhone) payload.customerPhone = nextPhone;
  if (nextEmail !== order.customerEmail) payload.customerEmail = nextEmail;
  if (status !== order.status) payload.status = status;
  if (nextNotes !== existingNotes) payload.notes = nextNotes;

  const nextAddress = normalizeAddressForCompare({
    ...shippingAddress,
    addressLine2: shippingAddress.addressLine2?.trim() || undefined,
    landmark: shippingAddress.landmark?.trim() || undefined,
  });
  const prevAddress = normalizeAddressForCompare(order.shippingAddress as ShippingAddress);
  if (JSON.stringify(nextAddress) !== JSON.stringify(prevAddress)) {
    payload.shippingAddress = nextAddress;
  }

  const changedItems: Array<{
    id: string;
    weight?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
  }> = [];

  for (const item of order.items) {
    const specs = itemSpecs[item.id] ?? { weight: '', length: '', width: '', height: '' };
    const weight = parseSpecNumber(specs.weight);
    const length = parseSpecNumber(specs.length);
    const width = parseSpecNumber(specs.width);
    const height = parseSpecNumber(specs.height);
    const patch: {
      id: string;
      weight?: number | null;
      length?: number | null;
      width?: number | null;
      height?: number | null;
    } = { id: item.id };
    let changed = false;

    if (!sameNullableNumber(weight, item.weight == null ? null : Number(item.weight))) {
      patch.weight = weight;
      changed = true;
    }
    if (!sameNullableNumber(length, item.length == null ? null : Number(item.length))) {
      patch.length = length;
      changed = true;
    }
    if (!sameNullableNumber(width, item.width == null ? null : Number(item.width))) {
      patch.width = width;
      changed = true;
    }
    if (!sameNullableNumber(height, item.height == null ? null : Number(item.height))) {
      patch.height = height;
      changed = true;
    }

    if (changed) changedItems.push(patch);
  }

  if (changedItems.length > 0) payload.items = changedItems;
  return payload;
}

function formatSpecValue(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '';
  return String(value);
}

function parseSpecNumber(value?: string): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatWeight(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function formatPackageSize(dims: { length: number | null; width: number | null; height: number | null }) {
  if (dims.length == null && dims.width == null && dims.height == null) return '—';
  const length = dims.length != null ? formatWeight(dims.length) : '—';
  const width = dims.width != null ? formatWeight(dims.width) : '—';
  const height = dims.height != null ? formatWeight(dims.height) : '—';
  return `L ${length} × W ${width} × H ${height} cm`;
}

function computePackageDimensions(
  items: Order['items'],
  specs: Record<string, { weight: string; length: string; width: string; height: string }>,
) {
  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;
  let hasLength = false;
  let hasWidth = false;
  let hasHeight = false;

  for (const item of items) {
    const itemSpecs = specs[item.id];
    const length = parseSpecNumber(itemSpecs?.length);
    const width = parseSpecNumber(itemSpecs?.width);
    const height = parseSpecNumber(itemSpecs?.height);

    if (length != null) {
      maxLength = Math.max(maxLength, length);
      hasLength = true;
    }
    if (width != null) {
      maxWidth = Math.max(maxWidth, width);
      hasWidth = true;
    }
    if (height != null) {
      totalHeight += height * item.quantity;
      hasHeight = true;
    }
  }

  return {
    length: hasLength ? maxLength : null,
    width: hasWidth ? maxWidth : null,
    height: hasHeight ? totalHeight : null,
  };
}

function SpecInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-[4.5rem] rounded-lg border border-[#e2e8f0] bg-white px-2 py-1.5 text-sm text-[#0f172a] focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
    />
  );
}

function ShipmentActions({
  orderId,
  shipment,
  onUpdated,
  onCancelled,
}: {
  orderId: string;
  shipment: ShipmentInfo;
  onUpdated: () => void;
  onCancelled?: () => void;
}) {
  const isQuick =
    Boolean(shipment.shiprocketOrderId) &&
    (!shipment.awbCode ||
      shipment.shiprocketShipmentId === shipment.shiprocketOrderId ||
      shipment.courierName?.toLowerCase().includes('quick'));

  const openUrl = async (label: string, fetcher: () => Promise<{ labelUrl?: string; invoiceUrl?: string; manifestUrl?: string }>, key: 'labelUrl' | 'invoiceUrl' | 'manifestUrl') => {
    const toastId = toast.loading(`Opening Shiprocket ${label}...`);
    try {
      const result = await fetcher();
      const url = result[key];
      if (!url) throw new Error('No URL returned');
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.dismiss(toastId);
      onUpdated();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(getApiErrorMessage(error, `Could not open Shiprocket ${label}`));
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this shipment? The order will return to Confirmed so you can create shipment again.')) return;
    const toastId = toast.loading('Cancelling shipment...');
    try {
      await adminOrderService.cancelShiprocketShipment(orderId);
      toast.dismiss(toastId);
      toast.success('Shipment cancelled — order moved to Confirmed');
      onCancelled?.();
      onUpdated();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(getApiErrorMessage(error, 'Could not cancel shipment'));
    }
  };

  const handleQuickTrack = async () => {
    const toastId = toast.loading('Fetching Quick rider status...');
    try {
      const result = await adminOrderService.trackQuickDelivery(orderId);
      toast.dismiss(toastId);
      const status =
        (typeof result.status === 'string' && result.status) ||
        (typeof (result.data as Record<string, unknown> | undefined)?.status === 'string' &&
          String((result.data as Record<string, unknown>).status)) ||
        'Tracking updated';
      toast.success(status);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(getApiErrorMessage(error, 'Could not track Quick delivery'));
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!isQuick && shipment.awbCode && (
        <button
          type="button"
          onClick={() => openUrl('label', () => adminOrderService.getShiprocketLabel(orderId), 'labelUrl')}
          className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f172a] hover:bg-[#f8fafc]"
        >
          Shiprocket label
        </button>
      )}
      {shipment.shiprocketOrderId && !isQuick && (
        <button
          type="button"
          onClick={() => openUrl('invoice', () => adminOrderService.getShiprocketInvoice(orderId), 'invoiceUrl')}
          className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f172a] hover:bg-[#f8fafc]"
        >
          Shiprocket invoice
        </button>
      )}
      {!isQuick && shipment.shiprocketShipmentId && (
        <button
          type="button"
          onClick={() => openUrl('manifest', () => adminOrderService.getShiprocketManifest(orderId), 'manifestUrl')}
          className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f172a] hover:bg-[#f8fafc]"
        >
          Manifest
        </button>
      )}
      {isQuick && (
        <button
          type="button"
          onClick={handleQuickTrack}
          className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f172a] hover:bg-[#f8fafc]"
        >
          Track Quick rider
        </button>
      )}
      <button
        type="button"
        onClick={handleCancel}
        className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 text-xs font-semibold text-[#b91c1c] hover:bg-[#fee2e2]"
      >
        Cancel shipment
      </button>
    </div>
  );
}

function ShipmentCard({
  title,
  badge,
  badgeVariant,
  shipment,
  emptyMessage,
  archivedAt,
  reason,
}: {
  title: string;
  badge: string;
  badgeVariant: 'active' | 'inactive';
  shipment?: ShipmentInfo | ShipmentHistoryRecord | null;
  emptyMessage?: string;
  archivedAt?: string;
  reason?: string;
}) {
  const hasData =
    shipment &&
    (shipment.shiprocketShipmentId ||
      shipment.awbCode ||
      shipment.trackingNumber ||
      shipment.courierName);

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
        <StatusBadge variant={badgeVariant}>{badge}</StatusBadge>
      </div>

      {!hasData ? (
        <p className="text-sm text-[#94a3b8]">{emptyMessage || 'No shipment data'}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <ShipmentField label="Method" value={shipment.method} />
          <ShipmentField label="Courier" value={shipment.courierName} />
          <ShipmentField label="AWB Code" value={shipment.awbCode} mono />
          <ShipmentField label="Tracking Number" value={shipment.trackingNumber} mono />
          <ShipmentField label="Shiprocket Order ID" value={shipment.shiprocketOrderId} mono />
          <ShipmentField label="Shiprocket Shipment ID" value={shipment.shiprocketShipmentId} mono />
          <ShipmentField label="Shipped At" value={shipment.shippedAt ? formatDate(shipment.shippedAt) : undefined} />
          <ShipmentField label="Delivered At" value={shipment.deliveredAt ? formatDate(shipment.deliveredAt) : undefined} />
          {archivedAt && (
            <ShipmentField label="Archived At" value={formatDate(archivedAt)} />
          )}
          {reason && <ShipmentField label="Reason" value={reason} />}
          {shipment.trackingUrl && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Tracking URL</p>
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block break-all text-sm font-medium text-[#0f172a] underline"
              >
                {shipment.trackingUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShipmentField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">{label}</p>
      <p className={`mt-1 text-sm text-[#0f172a] ${mono ? 'font-mono' : 'font-medium'}`}>
        {value || '—'}
      </p>
    </div>
  );
}
