'use client';

import { useEffect, useRef } from 'react';
import { getRealtimeSocket } from '@/lib/socket-client';
import { REALTIME_EVENTS } from '@/lib/realtime-events';
import { orderService } from '@/services/store.service';
import type { Order } from '@/types';

/**
 * Keeps My Orders in sync when admin updates status / payment / returns / refunds.
 */
export function useCustomerOrderRealtime(
  phone: string | null,
  onOrdersUpdate: (orders: Order[]) => void,
) {
  const phoneRef = useRef(phone);
  phoneRef.current = phone;
  const onOrdersUpdateRef = useRef(onOrdersUpdate);
  onOrdersUpdateRef.current = onOrdersUpdate;

  useEffect(() => {
    if (!phone) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const normalizedPhone = phone;

    const subscribe = () => {
      socket.emit(REALTIME_EVENTS.CUSTOMER_SUBSCRIBE, { phone: normalizedPhone });
    };

    const refreshOrders = async () => {
      const currentPhone = phoneRef.current;
      if (!currentPhone) return;
      try {
        const orders = await orderService.getMyOrders();
        onOrdersUpdateRef.current(orders);
      } catch {
        /* keep current list on transient failure */
      }
    };

    const onConnect = () => {
      subscribe();
    };

    socket.on('connect', onConnect);
    if (socket.connected) {
      subscribe();
    } else {
      socket.connect();
    }

    socket.on(REALTIME_EVENTS.CUSTOMER_ORDER_UPDATED, refreshOrders);

    return () => {
      socket.emit(REALTIME_EVENTS.CUSTOMER_UNSUBSCRIBE, { phone: normalizedPhone });
      socket.off('connect', onConnect);
      socket.off(REALTIME_EVENTS.CUSTOMER_ORDER_UPDATED, refreshOrders);
    };
  }, [phone]);
}
