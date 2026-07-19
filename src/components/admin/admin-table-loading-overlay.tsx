'use client';

import { Loader2 } from 'lucide-react';

interface AdminTableLoadingOverlayProps {
  show: boolean;
  label?: string;
  minHeight?: number;
}

/** Centered loading card over a table while refetching (keeps previous rows visible underneath). */
export function AdminTableLoadingOverlay({
  show,
  label = 'Loading…',
  minHeight = 220,
}: AdminTableLoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-[1px]"
      style={{ minHeight }}
    >
      <div className="flex flex-col items-center gap-2.5 rounded-xl bg-white px-5 py-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f172a]" strokeWidth={2.25} />
        <p className="text-xs font-semibold text-[#64748b]">{label}</p>
      </div>
    </div>
  );
}
