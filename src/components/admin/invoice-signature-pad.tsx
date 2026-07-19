'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { OptimizedImage } from '@/components/ui/optimized-image';

const PAD_HEIGHT = 208; // 30% taller than previous 160px (h-40)

interface InvoiceSignaturePadProps {
  savedSignature: string | null;
  isLoading?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  onSave: (dataUrl: string) => void;
  onDelete: () => void;
}

export function InvoiceSignaturePad({
  savedSignature,
  isLoading,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
}: InvoiceSignaturePadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SignatureCanvas>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);

  const updateWidth = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width > 0) setCanvasWidth(width);
  }, []);

  useEffect(() => {
    updateWidth();
    if (!containerRef.current) return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateWidth, isLoading]);

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.clear();
    setIsEmpty(true);
  }, [savedSignature]);

  const handleClear = () => {
    canvasRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (!canvasRef.current || canvasRef.current.isEmpty()) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="space-y-4">
      {savedSignature && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#64748b]">Current signature on invoices</p>
          <div className="flex min-h-[80px] items-center justify-end rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-6 py-4">
            <OptimizedImage
              src={savedSignature}
              alt="Saved invoice signature"
              width={200}
              height={80}
              className="max-h-16 w-auto object-contain"
              unoptimized
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-[#64748b]">
          {savedSignature ? 'Draw a new signature below to replace' : 'Draw your signature'}
        </p>
        <div
          ref={containerRef}
          className="overflow-hidden rounded-xl border-2 border-dashed border-[#cbd5e1] bg-white select-none"
          style={{ height: PAD_HEIGHT, touchAction: 'none' }}
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-[#94a3b8]">
              Loading signature...
            </div>
          ) : canvasWidth > 0 ? (
            <SignatureCanvas
              ref={canvasRef}
              clearOnResize={false}
              penColor="#0f172a"
              minWidth={1}
              maxWidth={2.5}
              canvasProps={{
                width: canvasWidth,
                height: PAD_HEIGHT,
                className: 'block w-full cursor-crosshair',
                style: {
                  width: canvasWidth,
                  height: PAD_HEIGHT,
                  touchAction: 'none',
                },
              }}
              onBegin={() => setIsEmpty(false)}
              onEnd={() => setIsEmpty(canvasRef.current?.isEmpty() ?? true)}
            />
          ) : null}
        </div>
      </div>

      <p className="text-xs text-[#64748b]">
        Press and drag with mouse, finger, or stylus to draw. It will appear at the bottom-right of printed invoices.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isEmpty}
          className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : savedSignature ? 'Update Signature' : 'Save Signature'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={isSaving}
          className="rounded-lg border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] disabled:opacity-60"
        >
          Clear
        </button>
        {savedSignature && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-lg border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete Signature'}
          </button>
        )}
      </div>
    </div>
  );
}
