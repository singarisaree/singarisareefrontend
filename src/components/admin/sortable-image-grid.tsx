'use client';

import { GripVertical, X } from 'lucide-react';
import { useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { cn } from '@/lib/utils';

export interface SortableImageItem {
  id: string;
  src: string;
  dashed?: boolean;
}

interface SortableImageGridProps {
  items: SortableImageItem[];
  onReorder: (orderedIds: string[]) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}

export function SortableImageGrid({
  items,
  onReorder,
  onRemove,
  disabled = false,
}: SortableImageGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next.map((item) => item.id));
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#64748b]">Drag images to set order (1 = main image)</p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              'flex flex-col gap-1.5',
              overIndex === index && dragIndex !== null && dragIndex !== index && 'opacity-90',
            )}
          >
            <div
              draggable={!disabled}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                'group relative h-24 w-full overflow-hidden rounded-md border bg-[#f1f5f9]',
                item.dashed ? 'border-dashed border-[#94a3b8]' : 'border-[#e2e8f0]',
                !disabled && 'cursor-grab active:cursor-grabbing',
                overIndex === index && dragIndex !== null && dragIndex !== index && 'ring-2 ring-[#0f172a]',
                disabled && 'opacity-60',
              )}
            >
              <OptimizedImage
                src={item.src}
                alt={`Variant image ${index + 1}`}
                fill
                sizes="6rem"
                className="object-cover"
                draggable={false}
              />
              {!disabled && (
                <span className="absolute bottom-1 left-1 rounded bg-white/90 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-3 w-3 text-[#64748b]" />
                </span>
              )}
              {onRemove && !disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="absolute right-1 top-1 rounded bg-[#0f172a]/80 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <span className="block text-center text-xs font-semibold text-[#475569]">
              {index + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
