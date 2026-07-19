'use client';

import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useLikedStore, type LikedProduct } from '@/stores/liked-store';
import { useLikedHydrated } from '@/hooks/use-liked-hydrated';
import { cn } from '@/lib/utils';

interface ProductLikeButtonProps {
  product: LikedProduct;
  className?: string;
  /** Larger button for product detail page */
  size?: 'sm' | 'md';
}

export function ProductLikeButton({
  product,
  className,
  size = 'sm',
}: ProductLikeButtonProps) {
  const hydrated = useLikedHydrated();
  const liked = useLikedStore((s) => s.items.some((item) => item.id === product.id));
  const toggle = useLikedStore((s) => s.toggle);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nowLiked = toggle(product);
    toast.success(nowLiked ? 'Added to liked products' : 'Removed from liked products');
  };

  const iconClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={liked ? 'Unlike product' : 'Like product'}
      aria-pressed={liked}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-white/95 text-maroon shadow-sm transition-colors hover:bg-white',
        size === 'md' ? 'h-11 w-11' : 'h-8 w-8',
        className,
      )}
    >
      <Heart
        className={cn(iconClass, hydrated && liked ? 'fill-maroon text-maroon' : 'text-maroon')}
        strokeWidth={1.75}
      />
    </button>
  );
}
