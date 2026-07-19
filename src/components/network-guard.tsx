'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiOff } from 'lucide-react';
import { api } from '@/lib/api';

export function NetworkGuard() {
  const [show, setShow] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleOffline = () => {
      setMessage('No internet connection. Please check your network.');
      setShow(true);
    };

    const handleOnline = async () => {
      try {
        await api.get('/health', { timeout: 5000 });
        setShow(false);
        window.location.reload();
      } catch {
        // server still not reachable
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!show) return;

    const interval = setInterval(async () => {
      try {
        await api.get('/health', { timeout: 5000 });
        setShow(false);
        window.location.reload();
      } catch {
        // still not reachable
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [show]);

  useEffect(() => {
    const id = api.interceptors.response.use(
      undefined,
      (error) => {
        if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error')) {
          const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
          setMessage(
            isOffline
              ? 'No internet connection. Please check your network.'
              : 'Server not reachable. Please try again.',
          );
          setShow(true);
        }
        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(id);
    };
  }, []);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await api.get('/health', { timeout: 5000 });
      setShow(false);
      window.location.reload();
    } catch {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      setMessage(
        isOffline
          ? 'No internet connection. Please check your network.'
          : 'Server not reachable. Please try again.',
      );
    } finally {
      setRetrying(false);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <WifiOff className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-[#0f172a]">Connection Lost</h2>
        <p className="mb-6 text-sm text-[#64748b]">{message}</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#0f172a] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:opacity-60"
        >
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
