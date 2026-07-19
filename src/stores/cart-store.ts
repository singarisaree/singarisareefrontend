import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  couponDiscount: number;
  isRefundCoupon: boolean;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productColorId: string) => void;
  updateQuantity: (productColorId: string, quantity: number) => void;
  setCoupon: (code: string | null, discount: number, isRefundCoupon?: boolean) => void;
  clearCart: () => void;
  syncFromServer: (items: CartItem[]) => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,
      isRefundCoupon: false,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.productColorId === item.productColorId);
          if (existing) {
            const newQty = Math.min(existing.quantity + (item.quantity || 1), item.maxStock);
            return {
              items: state.items.map((i) =>
                i.productColorId === item.productColorId ? { ...i, quantity: newQty } : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: item.quantity || 1 }],
          };
        });
      },

      removeItem: (productColorId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productColorId !== productColorId),
        }));
      },

      updateQuantity: (productColorId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productColorId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productColorId === productColorId
              ? { ...i, quantity: Math.min(quantity, i.maxStock) }
              : i,
          ),
        }));
      },

      setCoupon: (code, discount, isRefundCoupon = false) =>
        set({
          couponCode: code,
          couponDiscount: discount,
          isRefundCoupon: Boolean(code) && Boolean(isRefundCoupon),
        }),

      clearCart: () =>
        set({ items: [], couponCode: null, couponDiscount: 0, isRefundCoupon: false }),

      syncFromServer: (items) => set({ items }),

      getSubtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'singari-cart' },
  ),
);
