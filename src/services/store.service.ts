import { storeGet, storePost } from '@/lib/store-api';
import { apiGet } from '@/lib/api';
import type {
  Product,
  Category,
  HeroBanner,
  CustomerReview,
  InstagramFeed,
  PublicSettings,
  Order,
  OrderTotals,
  CartSyncResult,
  ReturnRequest,
  Coupon,
  ShippingQuoteResult,
  QuickQuoteResult,
  ShippingCountryOption,
} from '@/types';

export const productService = {
  getAll: (params?: Record<string, string>) => storeGet<Product[]>('/products', params),
  getBySlug: (slug: string) => storeGet<Product>(`/products/slug/${slug}`),
  getRelated: (id: string, limit = 4) =>
    storeGet<Product[]>(`/products/${id}/related`, { limit: String(limit) }),
  getLatestByCategory: () =>
    storeGet<Array<{ category: Category; products: Product[] }>>('/products/latest-by-category'),
};

export const categoryService = {
  getAll: () => storeGet<Category[]>('/categories'),
  getBySlug: (slug: string) => storeGet<Category>(`/categories/slug/${slug}`),
};

export const homeService = {
  getBanners: () => storeGet<HeroBanner[]>('/hero-banners'),
  getReviews: () => storeGet<CustomerReview[]>('/reviews'),
  getProductReviews: (productId: string) =>
    storeGet<CustomerReview[]>(`/reviews/product/${productId}`),
  getInstagram: () => storeGet<InstagramFeed[]>('/instagram'),
  getSettings: () => storeGet<PublicSettings>('/settings/public'),
};

export const storefrontService = {
  joinVip: async (data: { name: string; phone: string }) => {
    const res = await fetch('/api/vip-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      const err = new Error(
        typeof payload.message === 'string'
          ? payload.message
          : 'Could not join right now. Please try again.',
      );
      throw err;
    }
    return payload.data as { id: string };
  },
};

export const returnRequestService = {
  create: async (data: {
    orderId: string;
    phone: string;
    reason: string;
    items: Array<{ orderItemId: string; quantity: number }>;
    images: File[];
  }) => {
    const formData = new FormData();
    formData.append('orderId', data.orderId);
    formData.append('phone', data.phone);
    formData.append('reason', data.reason);
    formData.append('items', JSON.stringify(data.items));
    data.images.slice(0, 3).forEach((file) => {
      formData.append('images', file);
    });

    const res = await fetch('/api/return-request', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(
        typeof json.message === 'string' ? json.message : 'Could not submit return request.',
      );
    }
    return json.data as ReturnRequest;
  },
};

export const orderService = {
  calculate: (
    items: Array<{ productId: string; productColorId: string; quantity: number }>,
    couponCode?: string,
    shippingAddress?: Partial<{
      country: string;
      countryCode: string;
      state: string;
      city: string;
      postalCode: string;
      addressLine1: string;
      addressLine2: string;
      landmark: string;
      latitude: number;
      longitude: number;
    }>,
  ) => storePost<OrderTotals>('/orders/calculate', { items, couponCode, shippingAddress }),
  quoteShipping: (
    items: Array<{ productId: string; productColorId: string; quantity: number }>,
    shippingAddress: {
      country: string;
      countryCode?: string;
      state: string;
      city: string;
      postalCode: string;
      addressLine1?: string;
      addressLine2?: string;
      landmark?: string;
    },
  ) => storePost<ShippingQuoteResult>('/orders/shipping-quote', { items, shippingAddress }),
  quoteQuick: (
    items: Array<{ productId: string; productColorId: string; quantity: number }>,
    delivery: {
      latitude: number;
      longitude: number;
      postalCode?: string;
      city?: string;
    },
  ) => storePost<QuickQuoteResult>('/orders/quick-quote', { items, delivery }),
  getShippingCountries: () => storeGet<ShippingCountryOption[]>('/orders/shipping-countries'),
  syncCart: (items: Array<{ productId: string; productColorId: string; quantity: number }>) =>
    storePost<CartSyncResult>('/orders/cart-sync', { items }),
  checkout: (data: Record<string, unknown>) =>
    storePost<{
      order: Order;
      paymentRequired?: boolean;
      razorpayOrderId: string | null;
      keyId: string | null;
      amount: number;
      currency: string;
    }>('/orders/checkout', data),
  abandonCheckout: (orderNumber: string) =>
    storePost<{ abandoned: boolean }>(`/orders/${orderNumber}/abandon-checkout`),
  getMyOrders: () => apiGet<Order[]>('/orders/mine'),
  validateCoupon: (code: string, subtotal: number, phone?: string, shippingCharge?: number) =>
    storePost<{
      discount: number;
      isRefundCoupon?: boolean;
      coupon?: { code: string; isRefundCoupon?: boolean };
    }>('/orders/validate-coupon', {
      code,
      subtotal,
      ...(phone ? { phone } : {}),
      ...(shippingCharge != null ? { shippingCharge } : {}),
    }),
  getAvailableCoupons: (subtotal: number, phone?: string, shippingCharge?: number) =>
    storeGet<Array<Coupon & { eligible: boolean; discountPreview: number }>>(
      '/orders/available-coupons',
      {
        subtotal: String(subtotal),
        ...(phone ? { phone } : {}),
        ...(shippingCharge != null ? { shippingCharge: String(shippingCharge) } : {}),
      },
    ),
  retryPayment: (orderNumber: string) =>
    storePost<{
      razorpayOrderId: string;
      keyId: string;
      amount: number;
      currency: string;
    }>(`/orders/${orderNumber}/retry-payment`),
  verifyPayment: (data: {
    orderNumber: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => storePost<{ orderNumber: string; paymentStatus: string }>('/payments/verify', data),
  reportPaymentFailed: (orderNumber: string, reason?: string) =>
    storePost<{ orderNumber: string; paymentStatus: string }>('/payments/failed', {
      orderNumber,
      ...(reason ? { reason } : {}),
    }),
  getPaymentStatus: (orderNumber: string, context?: 'return' | 'poll') =>
    storeGet<{
      status: string;
      paymentStatus: string;
      orderNumber: string;
      estimatedDelivery?: string | null;
      deliveryType?: 'QUICK' | 'INDIA' | 'INTERNATIONAL';
      isHyderabadDelivery?: boolean;
    }>(`/payments/status/${orderNumber}`, context ? { context } : undefined),
};
