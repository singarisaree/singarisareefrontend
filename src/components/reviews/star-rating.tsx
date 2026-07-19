'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRating({
  rating,
  size = 'sm',
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: 'sm' | 'md';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const iconClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type={interactive ? 'button' : undefined}
          disabled={!interactive}
          onClick={() => interactive && onChange?.(i + 1)}
          className={cn(interactive && 'cursor-pointer transition-transform hover:scale-110')}
          aria-label={interactive ? `Rate ${i + 1} stars` : undefined}
        >
          <Star
            className={cn(
              iconClass,
              i < rating ? 'fill-amber-400 text-amber-400' : 'text-[#e2e8f0]',
            )}
          />
        </button>
      ))}
    </div>
  );
}
