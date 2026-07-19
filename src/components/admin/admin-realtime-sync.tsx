'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getRealtimeSocket, reconnectRealtimeSocket } from '@/lib/socket-client';
import {
  REALTIME_EVENTS,
  type OrderRealtimePayload,
  type RefundRealtimePayload,
  type ReturnRequestRealtimePayload,
} from '@/lib/realtime-events';
import { formatShortOrderNumber } from '@/lib/utils';

export function AdminRealtimeSync() {
  const queryClient = useQueryClient();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const socket = reconnectRealtimeSocket() ?? getRealtimeSocket();
    if (!socket) return;

    const timers = timersRef.current;

    const debouncedInvalidate = (key: string, queryKey: unknown[]) => {
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          void queryClient.invalidateQueries({ queryKey });
        }, 400),
      );
    };

    const refreshOrders = () => {
      debouncedInvalidate('admin-orders', ['admin-orders']);
      debouncedInvalidate('admin-dispatches', ['admin-dispatches']);
    };

    const refreshDashboard = () => {
      debouncedInvalidate('dashboard-stats', ['dashboard-stats']);
    };

    const onOrderCreated = (payload: OrderRealtimePayload) => {
      refreshOrders();
      refreshDashboard();
      // Don't toast unpaid checkouts as "new orders"
      if (payload.status === 'PAYMENT_PENDING') return;
      toast.info(`New order ${formatShortOrderNumber(payload.orderNumber)}`, { duration: 2500 });
    };

    const onOrderStatusChanged = (payload: OrderRealtimePayload) => {
      refreshOrders();
      refreshDashboard();
      if (payload.orderId) {
        void queryClient.invalidateQueries({ queryKey: ['admin-order', payload.orderId] });
      }
      if (payload.status === 'FAILED') {
        toast.warning(`Payment failed for ${formatShortOrderNumber(payload.orderNumber)}`, { duration: 2500 });
      } else if (payload.status === 'PLACED') {
        toast.success(`Order ${formatShortOrderNumber(payload.orderNumber)} placed`, { duration: 2500 });
      } else if (payload.status === 'READY_TO_SHIP') {
        toast.success(`Shipment created for ${formatShortOrderNumber(payload.orderNumber)}`, { duration: 2500 });
      } else if (payload.status === 'SHIPPED' || payload.status === 'IN_TRANSIT') {
        toast.info(`${formatShortOrderNumber(payload.orderNumber)} ${payload.status === 'SHIPPED' ? 'shipped' : 'in transit'}`, {
          duration: 2500,
        });
      } else if (payload.status === 'DELIVERED') {
        toast.success(`${formatShortOrderNumber(payload.orderNumber)} delivered`, { duration: 2500 });
      }
    };

    const onReturnCreated = (payload: ReturnRequestRealtimePayload) => {
      debouncedInvalidate('admin-return-requests', ['admin-return-requests']);
      refreshDashboard();
      toast.info('New return request received', { duration: 2500 });
      if (payload.returnRequestId) {
        void queryClient.invalidateQueries({
          queryKey: ['admin-return-request', payload.returnRequestId],
        });
      }
    };

    const onReturnUpdated = (payload: ReturnRequestRealtimePayload) => {
      debouncedInvalidate('admin-return-requests', ['admin-return-requests']);
      debouncedInvalidate('admin-orders', ['admin-orders']);
      refreshDashboard();
      if (payload.returnRequestId) {
        void queryClient.invalidateQueries({
          queryKey: ['admin-return-request', payload.returnRequestId],
        });
      }
      if (payload.orderId) {
        void queryClient.invalidateQueries({ queryKey: ['admin-order', payload.orderId] });
      }
    };

    const onRefundProcessed = (payload: RefundRealtimePayload) => {
      debouncedInvalidate('admin-refunds', ['admin-refunds']);
      refreshOrders();
      refreshDashboard();
      if (payload.orderId) {
        void queryClient.invalidateQueries({ queryKey: ['admin-order', payload.orderId] });
      }
      toast.success(`Refund processed for ${formatShortOrderNumber(payload.orderNumber)}`, { duration: 2500 });
    };

    const joinAdmin = () => {
      socket.emit(REALTIME_EVENTS.ADMIN_JOIN);
    };

    const onConnect = () => {
      joinAdmin();
    };

    socket.on('connect', onConnect);
    if (socket.connected) joinAdmin();

    socket.on(REALTIME_EVENTS.ORDER_CREATED, onOrderCreated);
    socket.on(REALTIME_EVENTS.ORDER_STATUS_CHANGED, onOrderStatusChanged);
    socket.on(REALTIME_EVENTS.RETURN_REQUEST_CREATED, onReturnCreated);
    socket.on(REALTIME_EVENTS.RETURN_REQUEST_UPDATED, onReturnUpdated);
    socket.on(REALTIME_EVENTS.REFUND_PROCESSED, onRefundProcessed);
    socket.on(REALTIME_EVENTS.DASHBOARD_REFRESH, refreshDashboard);

    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      socket.off('connect', onConnect);
      socket.off(REALTIME_EVENTS.ORDER_CREATED, onOrderCreated);
      socket.off(REALTIME_EVENTS.ORDER_STATUS_CHANGED, onOrderStatusChanged);
      socket.off(REALTIME_EVENTS.RETURN_REQUEST_CREATED, onReturnCreated);
      socket.off(REALTIME_EVENTS.RETURN_REQUEST_UPDATED, onReturnUpdated);
      socket.off(REALTIME_EVENTS.REFUND_PROCESSED, onRefundProcessed);
      socket.off(REALTIME_EVENTS.DASHBOARD_REFRESH, refreshDashboard);
    };
  }, [queryClient]);

  return null;
}
