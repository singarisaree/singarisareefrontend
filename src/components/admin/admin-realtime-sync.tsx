'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    const socket = reconnectRealtimeSocket() ?? getRealtimeSocket();
    if (!socket) return;

    const invalidate = (queryKey: unknown[]) => {
      void queryClient.invalidateQueries({ queryKey });
    };

    const refreshOrders = () => {
      invalidate(['admin-orders']);
      invalidate(['admin-dispatches']);
    };

    const refreshDashboard = () => {
      invalidate(['dashboard-stats']);
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
      invalidate(['admin-orders']);
      invalidate(['admin-refunds']);
      refreshDashboard();
      if (payload.orderId) {
        void queryClient.invalidateQueries({ queryKey: ['admin-order', payload.orderId] });
      }
    };

    const onReturnUpdated = (payload: ReturnRequestRealtimePayload) => {
      invalidate(['admin-orders']);
      invalidate(['admin-refunds']);
      refreshDashboard();
      if (payload.orderId) {
        void queryClient.invalidateQueries({ queryKey: ['admin-order', payload.orderId] });
      }
    };

    const onRefundProcessed = (payload: RefundRealtimePayload) => {
      invalidate(['admin-refunds']);
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
