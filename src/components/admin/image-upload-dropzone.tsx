'use client';

import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadDropzoneProps {
  onFiles: (files: FileList | null) => void;
  disabled?: boolean;
  maxImages?: number;
  currentCount?: number;
  className?: string;
  showRatioTip?: boolean;
}

export function ImageUploadDropzone({
  onFiles,
  disabled = false,
  maxImages = 6,
  currentCount = 0,
  className,
  showRatioTip = true,
}: ImageUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = Math.max(0, maxImages - currentCount);
  const isFull = remaining === 0 || disabled;

  return (
    <div className={cn(className)}>
      <button
        type="button"
        disabled={isFull}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-xs font-medium transition-colors',
          isFull
            ? 'cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]'
            : 'border-[#94a3b8] bg-[#f8fafc] text-[#334155] hover:border-[#0f172a] hover:bg-[#f1f5f9] hover:text-[#0f172a]',
        )}
      >
        <ImagePlus className="h-3.5 w-3.5 shrink-0" />
        <span>
          {isFull
            ? `Max ${maxImages} images`
            : currentCount > 0
              ? 'Add more images'
              : 'Upload images'}
        </span>
      </button>
      {showRatioTip && (
        <p className="mt-1.5 text-[11px] leading-snug text-[#64748b]">
          Tip: Use <span className="font-medium text-[#334155]">3:4</span> portrait
          (e.g. 1200×1600) for best fit on store.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        disabled={isFull}
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
