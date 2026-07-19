'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
