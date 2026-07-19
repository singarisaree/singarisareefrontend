'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, RotateCcw, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { OrderTrackingTimeline } from '@/components/orders/order-tracking-timeline';
import { shouldHideOrderTracking } from '@/components/orders/order-payment-status-notice';
import { getCustomerFacingOrderStatus } from '@/lib/order-return';
import { ReturnRequestSection } from '@/components/orders/return-request-section';
import { useCustomerAuth } from '@/components/customer-auth-provider';
import { orderService } from '@/services/store.service';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  formatReturnDeadline,
  getReturnBarButtonLabel,
  getReturnBarStatusLabel,
  hasActiveReturnRequest,
  isReturnEligible,
  isReturnRejected,
  isReturnWindowClosed,
  shouldShowReturnBar,
} from '@/lib/order-return';
import {
  cn,
  formatPrice,
  formatDate,
  formatTime,
  formatDateTime,
  getOrderStatusColor,
  getOrderStatusLabel,
  formatShortOrderNumber,
  getOrderListDateText,
  formatPaymentMethodLabel,
  formatCouponDiscountLabel,
} from '@/lib/utils';
import { useCustomerOrderRealtime } from '@/hooks/use-customer-order-realtime';
import { resolveDeliveryType } from '@/lib/delivery-type';
import { isHyderabadDeliveryArea } from '@/lib/shipping';
import type { Order, ReturnRequest } from '@/types';

function OrderCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-beige bg-white">
      <div className="flex gap-4 p-4">
        <div className="h-[88px] w-[68px] shrink-0 rounded bg-beige" />
        <div className="min-w-0 flex-1 space-y-2.5 py-1">
          <div className="h-4 w-4/5 rounded bg-beige" />
          <div className="h-3 w-2/5 rounded bg-beige" />
          <div className="h-3 w-3/5 rounded bg-beige" />
          <div className="h-4 w-1/4 rounded bg-beige" />
        </div>
      </div>
    </div>
  );
}

function getOrderStatusLine(order: Order, displayStatus: string): string {
  const deliveredAt = order.shipping?.deliveredAt;
  const deliveredUpdate = order.trackingHistory?.find((e) => e.status === 'DELIVERED');
  const deliveredTimestamp = deliveredAt || deliveredUpdate?.timestamp;
  const deliveryType = resolveDeliveryType(order.shippingAddress);
  const eta = order.estimatedDelivery ? new Date(order.estimatedDelivery) : null;
  const hasEta = eta != null && Number.isFinite(eta.getTime());
  const hyderabad =
    deliveryType === 'INDIA' &&
    isHyderabadDeliveryArea({
      city: order.shippingAddress?.city,
      postalCode: order.shippingAddress?.postalCode,
      landmark: order.shippingAddress?.landmark,
      state: order.shippingAddress?.state,
    });

  if (displayStatus === 'DELIVERED' && deliveredTimestamp) {
    return `Delivered on ${formatDate(deliveredTimestamp)}`;
  }
  if (displayStatus === 'PAYMENT_PENDING') {
    return 'Complete payment to confirm your order';
  }
  if (displayStatus === 'FAILED') {
    return 'Payment failed — refund in 3–7 days if debited';
  }
  if (['READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT'].includes(displayStatus)) {
    if (deliveryType === 'QUICK') {
      if (hasEta) {
        const looksLikeDateOnly =
          eta.getHours() === 0 && eta.getMinutes() === 0 && eta.getSeconds() === 0;
        if (!looksLikeDateOnly) {
          return `Instant delivery · Arrives by ${formatTime(eta)}`;
        }
      }
      return 'Instant delivery · On the way';
    }
    if (deliveryType === 'INTERNATIONAL') {
      return hasEta
        ? `Expected by ${formatDate(eta)}`
        : 'International order · On the way';
    }
    if (hyderabad) {
      return 'Arrives in 2 days';
    }
    return 'Expected in 3–7 days';
  }
  if (displayStatus === 'PLACED' || displayStatus === 'CONFIRMED') {
    if (deliveryType === 'QUICK') {
      if (hasEta) {
        const looksLikeDateOnly =
          eta.getHours() === 0 && eta.getMinutes() === 0 && eta.getSeconds() === 0;
        if (!looksLikeDateOnly) {
          return `Instant delivery · Arrives by ${formatTime(eta)}`;
        }
      }
      return 'Instant delivery · Arrives today';
    }
    if (deliveryType === 'INTERNATIONAL') {
      return hasEta
        ? `Expected by ${formatDate(eta)}`
        : 'Delivery timeline confirmed after shipping quote';
    }
    // Hyderabad Standard: always 2 days
    if (hyderabad) {
      return 'Arrives in 2 days';
    }
    // Other India cities: fixed 3–7 day window
    return 'Expected in 3–7 days';
  }
  return getOrderListDateText({ ...order, status: displayStatus });
}

export default function MyOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { customer, isLoading: authLoading } = useCustomerAuth();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedReturnOrderId, setExpandedReturnOrderId] = useState<string | null>(null);

  const customerPhone = customer?.phone ?? '';

  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ['my-orders', customerPhone],
    queryFn: () => orderService.getMyOrders(),
    enabled: Boolean(customerPhone) && !authLoading,
    staleTime: 30_000,
  });

  const handleOrdersUpdate = useCallback(
    (updated: Order[]) => {
      queryClient.setQueryData(['my-orders', customerPhone], updated);
    },
    [queryClient, customerPhone],
  );

  useCustomerOrderRealtime(customerPhone || null, handleOrdersUpdate);

  useEffect(() => {
    if (authLoading || customer) return;
    router.replace('/login?next=/my-orders');
  }, [authLoading, customer, router]);

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId((current) => (current === orderId ? null : orderId));
    setExpandedReturnOrderId(null);
  };

  const openReturnFlow = (orderId: string) => {
    setExpandedReturnOrderId((current) => (current === orderId ? null : orderId));
    setExpandedOrderId(orderId);
  };

  const handleReturnSubmitted = (orderId: string, request: ReturnRequest) => {
    queryClient.setQueryData<Order[]>(['my-orders', customerPhone], (prev) =>
      (prev ?? []).map((order) =>
        order.id === orderId
          ? { ...order, returnRequests: [request, ...(order.returnRequests || [])] }
          : order,
      ),
    );
  };

  const showSkeleton = authLoading || !customer || ordersLoading;
  const loadError = ordersError ? getApiErrorMessage(ordersError) : null;

  return (
    <>
      <div className="min-h-[60vh] bg-beige/20">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-beige pb-4">
            <div>
              <h1 className="font-serif text-2xl text-charcoal sm:text-3xl">My Orders</h1>
              {customer && !showSkeleton && orders.length > 0 ? (
                <p className="mt-1 text-sm text-brown-light">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </p>
              ) : null}
            </div>
          </div>

          {showSkeleton ? (
            <div className="space-y-3">
              <OrderCardSkeleton />
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-red-800">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => void queryClient.invalidateQueries({ queryKey: ['my-orders'] })}
              >
                Try again
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-lg border border-beige bg-white px-6 py-16 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-gold/70" strokeWidth={1.25} />
              <h2 className="mt-4 font-medium text-charcoal">No orders yet</h2>
              <p className="mt-2 text-sm text-brown-light">
                When you place an order, it will appear here automatically.
              </p>
              <Link href="/collections" className="mt-6 inline-block">
                <Button variant="gold">Start Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const displayStatus = getCustomerFacingOrderStatus(order);
                const isExpanded = expandedOrderId === order.id;
                const isReturnExpanded = expandedReturnOrderId === order.id;
                const firstItem = order.items[0];
                const extraItems = order.items.length - 1;
                const returnEligible = isReturnEligible(order);
                const activeReturn = hasActiveReturnRequest(order);
                const returnRejected = isReturnRejected(order);
                const showReturnBar = shouldShowReturnBar(order);
                const returnDeadline = formatReturnDeadline(order);
                const returnBarStatus = getReturnBarStatusLabel(order);
                const returnButtonLabel = getReturnBarButtonLabel(order, isReturnExpanded);
                const returnWindowClosed = isReturnWindowClosed(order);
                const statusLine = getOrderStatusLine(order, displayStatus);
                const payment = order.payments?.[0];
                const isRefunded = displayStatus === 'REFUNDED';
                const paymentStatus = isRefunded
                  ? 'REFUNDED'
                  : String(payment?.status || 'N/A').toUpperCase();
                const paymentStatusClass =
                  paymentStatus === 'REFUNDED' || paymentStatus === 'SUCCESS'
                    ? 'text-emerald-600'
                    : paymentStatus === 'PENDING'
                      ? 'text-orange-600'
                      : paymentStatus === 'FAILED'
                        ? 'text-red-600'
                        : 'text-charcoal';

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-lg border border-beige bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleOrder(order.id)}
                      className="flex w-full gap-4 p-4 text-left transition-colors hover:bg-beige/20 sm:p-5"
                      aria-expanded={isExpanded}
                    >
                      {firstItem?.imageUrl ? (
                        <div className="relative h-[88px] w-[68px] shrink-0 overflow-hidden rounded-md bg-beige">
                          <Image
                            src={firstItem.imageUrl}
                            alt={firstItem.productName}
                            fill
                            sizes="68px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-[88px] w-[68px] shrink-0 items-center justify-center rounded-md bg-beige text-xs text-brown-light">
                          No img
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-medium text-charcoal sm:text-base">
                              {firstItem?.productName || 'Order items'}
                              {extraItems > 0 ? (
                                <span className="font-normal text-brown-light">
                                  {' '}
                                  + {extraItems} more
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-1 text-xs text-brown-light">
                              Order ID : {formatShortOrderNumber(order.orderNumber)}
                            </p>
                            <p className="mt-0.5 text-xs text-brown-light">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs',
                              getOrderStatusColor(displayStatus),
                            )}
                          >
                            {getOrderStatusLabel(displayStatus)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-charcoal">{statusLine}</p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-charcoal">
                            {formatPrice(Number(order.grandTotal))}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs font-medium text-maroon">
                            {isExpanded ? 'Hide details' : 'View details'}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                      </div>
                    </button>

                    {showReturnBar && (
                      <div className="border-t border-beige px-4 py-2.5 sm:px-5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            {returnBarStatus && (
                              <p
                                className={cn(
                                  'text-[10px] font-medium uppercase tracking-wide',
                                  returnRejected ? 'text-red-600' : 'text-gold',
                                )}
                              >
                                {returnBarStatus}
                              </p>
                            )}
                            {returnDeadline && !activeReturn && (
                              <p className="text-xs text-brown-light">
                                Return till{' '}
                                <span className="font-medium text-charcoal">{returnDeadline}</span>
                              </p>
                            )}
                          </div>
                          {activeReturn || returnEligible ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 shrink-0 px-3 text-[11px]"
                              onClick={() => openReturnFlow(order.id)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              {returnButtonLabel}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {returnWindowClosed && !showReturnBar && returnDeadline && (
                      <div className="border-t border-beige px-4 py-2.5 sm:px-5">
                        <p className="text-xs text-brown-light">
                          Return window closed on{' '}
                          <span className="font-medium text-charcoal">{returnDeadline}</span>
                        </p>
                      </div>
                    )}

                    {customerPhone && isReturnExpanded && (
                      <div className="border-t border-beige px-4 pb-4 pt-2 sm:px-5">
                        <ReturnRequestSection
                          order={order}
                          phone={customerPhone}
                          onSubmitted={(request) => handleReturnSubmitted(order.id, request)}
                        />
                      </div>
                    )}

                    {isExpanded && (
                      <div className="border-t border-beige bg-beige/10 px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex gap-3 rounded-md bg-white p-3">
                              {item.imageUrl && (
                                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-beige">
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.productName}
                                    fill
                                    sizes="3rem"
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium">{item.productName}</p>
                                <p className="text-xs text-brown-light">
                                  {item.colorName} · Qty {item.quantity}
                                </p>
                                <p className="text-sm">{formatPrice(Number(item.totalPrice))}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {!shouldHideOrderTracking(order) && (
                          <div className="mt-5">
                            <OrderTrackingTimeline order={order} />
                          </div>
                        )}

                        <div className="mt-5 rounded-lg border border-beige bg-white p-4">
                          <h3 className="text-sm font-medium text-charcoal">Delivery address</h3>
                          <p className="mt-2 text-sm text-brown-light">
                            {order.shippingAddress.addressLine1}
                            {order.shippingAddress.addressLine2
                              ? `, ${order.shippingAddress.addressLine2}`
                              : ''}
                            , {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                            {order.shippingAddress.postalCode}
                          </p>
                        </div>

                        <div className="mt-4 rounded-lg border border-beige bg-white p-4">
                          <h3 className="text-sm font-medium text-charcoal">Payment</h3>
                          <div className="mt-3 space-y-1.5 text-sm">
                            <div className="flex items-center justify-between text-brown-light">
                              <span>Subtotal</span>
                              <span>{formatPrice(Number(order.subtotal))}</span>
                            </div>
                            <div className="flex items-center justify-between text-brown-light">
                              <span>Shipping</span>
                              <span>{formatPrice(Number(order.shippingCharge))}</span>
                            </div>
                            {Number(order.discountAmount) > 0 && (
                              <div className="flex items-center justify-between text-gold">
                                <span>
                                  {formatCouponDiscountLabel({
                                    couponCode: order.couponCode,
                                    isRefundCoupon: order.coupon?.isRefundCoupon,
                                  })}
                                </span>
                                <span>-{formatPrice(Number(order.discountAmount))}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-brown-light">
                              <span>Status</span>
                              <span className={`font-medium ${paymentStatusClass}`}>
                                {paymentStatus === 'REFUNDED'
                                  ? 'Refunded'
                                  : paymentStatus === 'SUCCESS'
                                    ? 'Paid'
                                    : payment?.status || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-brown-light">
                              <span>Method</span>
                              <span>
                                {formatPaymentMethodLabel(payment, {
                                  couponCode: order.couponCode,
                                  grandTotal: order.grandTotal,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-beige pt-2 font-medium text-charcoal">
                              <span>Total paid</span>
                              <span>{formatPrice(Number(order.grandTotal))}</span>
                            </div>
                          </div>
                        </div>

                        {order.shipping?.trackingUrl && (
                          <a
                            href={order.shipping.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-maroon hover:underline"
                          >
                            Track shipment
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        )}

                        {customerPhone && !showReturnBar && displayStatus === 'DELIVERED' && (
                          <ReturnRequestSection
                            order={order}
                            phone={customerPhone}
                            onSubmitted={(request) => handleReturnSubmitted(order.id, request)}
                          />
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
