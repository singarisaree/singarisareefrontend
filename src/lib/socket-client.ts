'use client';

import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN } from '@/lib/api-origin';

let socket: Socket | null = null;

function createSocket(): Socket {
  return io(API_ORIGIN, {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    timeout: 12000,
  });
}

/** Shared Socket.IO client for admin + customer realtime updates. */
export function getRealtimeSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    socket = createSocket();
  } else if (!socket.connected && !socket.active) {
    socket.connect();
  }

  return socket;
}

/**
 * Force a fresh handshake so httpOnly auth cookies are picked up
 * (needed after admin login if a guest socket was already open).
 */
export function reconnectRealtimeSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = createSocket();
  return socket;
}

export function disconnectRealtimeSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
