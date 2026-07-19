import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LikedProduct {
  id: string;
  slug: string;
  name: string;
  defaultImage?: string;
  effectivePrice: number;
  mrp: number;
  displaySoldCount?: number;
  isComingSoon?: boolean;
  isOutOfStock?: boolean;
}

interface LikedState {
  items: LikedProduct[];
  toggle: (product: LikedProduct) => boolean;
  remove: (productId: string) => void;
  isLiked: (productId: string) => boolean;
  clear: () => void;
}

export const useLikedStore = create<LikedState>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (product) => {
        const exists = get().items.some((item) => item.id === product.id);
        if (exists) {
          set((state) => ({
            items: state.items.filter((item) => item.id !== product.id),
          }));
          return false;
        }
        set((state) => ({
          items: [
            {
              id: product.id,
              slug: product.slug,
              name: product.name,
              defaultImage: product.defaultImage,
              effectivePrice: product.effectivePrice,
              mrp: product.mrp,
              displaySoldCount: product.displaySoldCount,
              isComingSoon: product.isComingSoon,
              isOutOfStock: product.isOutOfStock,
            },
            ...state.items,
          ],
        }));
        return true;
      },

      remove: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      isLiked: (productId) => get().items.some((item) => item.id === productId),

      clear: () => set({ items: [] }),
    }),
    { name: 'singari-liked' },
  ),
);
