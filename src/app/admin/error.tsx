'use client';

import { useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNetworkError =
    error.message === 'SERVER_UNREACHABLE' ||
    error.message === 'fetch failed' ||
    error.message === 'Network Error' ||
    error.message?.includes('ECONNREFUSED');

  useEffect(() => {
    if (!isNetworkError) {
      console.error(error);
    }
  }, [error, isNetworkError]);

  if (isNetworkError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <WifiOff className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[#0f172a]">Server Not Reachable</h2>
          <p className="mb-6 text-sm text-[#64748b]">
            Please check your internet connection or try again later.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#0f172a] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h2 className="mb-2 text-lg font-semibold text-[#0f172a]">Something went wrong</h2>
        <p className="mb-6 text-sm text-[#64748b]">
          Please try again later.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#0f172a] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
