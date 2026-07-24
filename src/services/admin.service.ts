import {
  api,
  apiPost,
  apiGet,
  apiPut,
  apiDelete,
  apiPatch,
  apiGetPaginated,
  type ApiResponse,
} from "@/lib/api";
import type {
  Admin,
  DashboardStats,
  Order,
  Product,
  ProductImage,
  Coupon,
  HeroBanner,
  InstagramReel,
  CustomerReview,
  Category,
  StoreCustomer,
  MarketingTemplate,
  MarketingCampaign,
  EmailMarketingTemplate,
  EmailMarketingCampaign,
  DispatchRecord,
  CourierPartnerTab,
  ReturnRequest,
  RefundEligibleOrder,
} from "@/types";

export const adminAuthService = {
  login: (email: string, password: string) =>
    apiPost<{ admin: Admin }>("/auth/login", { email, password }),
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    apiPost<{ emailSent: boolean; email: string }>("/auth/change-password", data),
  logout: () => apiPost("/auth/logout"),
  me: () => apiGet<{ admin: Admin }>("/auth/me"),
};

export const adminDashboardService = {
  getStats: () => apiGet<DashboardStats>("/dashboard/stats"),
  listInventory: (params?: Record<string, string>, signal?: AbortSignal) =>
    apiGetPaginated<InventoryItem[]>("/dashboard/inventory", params, {
      signal,
    }),
  getInventory: async (params?: Record<string, string>) =>
    (await apiGetPaginated<InventoryItem[]>("/dashboard/inventory", params))
      .data,
  listDispatches: async (
    params?: Record<string, string>,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get<
      ApiResponse<{
        dispatches: DispatchRecord[];
        courierPartners: CourierPartnerTab[];
      }>
    >("/dashboard/dispatches", { params, signal });
    if (!data.meta)
      throw new Error("Expected paginated response but meta was missing");
    return {
      dispatches: data.data?.dispatches ?? [],
      courierPartners: data.data?.courierPartners ?? [],
      meta: data.meta,
    };
  },
};

interface InventoryItem {
  id: string;
  quantity: number;
  reserved: number;
  lowStockAlert: number;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    createdAt?: string;
    category?: { name: string } | null;
  };
  productColor: { id: string; name: string };
}

export interface ShiprocketCourierOption {
  courierId: number;
  courierName: string;
  rate: number;
  etd: string | null;
  rating: number | null;
}

export type ShiprocketShippingMode = "domestic" | "international" | "quick";

export const adminOrderService = {
  list: (params?: Record<string, string>, signal?: AbortSignal) =>
    apiGetPaginated<Order[]>("/orders", params, { signal }),
  getAll: async (params?: Record<string, string>) =>
    (await apiGetPaginated<Order[]>("/orders", params)).data,
  getById: (id: string, signal?: AbortSignal) =>
    apiGet<Order>(`/orders/${id}`, undefined, { signal }),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiPatch(`/orders/${id}/status`, { status, notes }),
  bulkUpdateStatus: (orderIds: string[], status: string, notes?: string) =>
    apiPost<{
      succeeded: string[];
      failed: Array<{ orderId: string; message: string }>;
      successCount: number;
      failedCount: number;
    }>("/orders/bulk-status", { orderIds, status, notes }),
  getByIds: (orderIds: string[]) =>
    apiPost<Order[]>("/orders/bulk-fetch", { orderIds }),
  update: (id: string, data: Record<string, unknown>) =>
    apiPatch<Order>(`/orders/${id}`, data),
  searchEscalation: (q: string) =>
    apiGet<
      Array<{
        id: string;
        orderNumber: string;
        status: string;
        customerName: string;
        customerPhone: string;
        customerEmail: string;
        grandTotal: number;
        refundedAt: string | null;
        refundCouponCode: string | null;
        createdAt: string;
        updatedAt: string;
        payments: Array<{
          status: string;
          method: string | null;
          amount: number;
        }>;
        trackingHistory: Array<{ status: string; timestamp: string }>;
      }>
    >("/orders/escalation/search", { q }),
  applyEscalation: (id: string, data: Record<string, unknown>) =>
    apiPatch<Order>(`/orders/${id}/escalation`, data),
  createAdminOrder: (data: Record<string, unknown>) =>
    apiPost("/orders/admin", data),
  createManualShipping: (orderId: string, data: Record<string, string>) =>
    apiPost(`/dashboard/shipping/${orderId}/manual`, data),
  getAvailableCouriers: (
    orderId: string,
    mode: ShiprocketShippingMode = "domestic",
  ) =>
    apiGet<{
      mode: ShiprocketShippingMode;
      couriers: ShiprocketCourierOption[];
    }>(`/dashboard/shipping/${orderId}/couriers`, { mode }),
  createShiprocketOrder: (
    orderId: string,
    data: {
      mode?: ShiprocketShippingMode;
      courierId?: number;
      pickupDate?: string;
      courierName?: string;
    },
  ) => apiPost(`/dashboard/shipping/${orderId}/shiprocket`, data),
  quoteBulkShiprocketOrders: (orderIds: string[]) =>
    apiPost<{
      quotes: Array<{
        orderId: string;
        orderNumber: string | null;
        courierId: number | null;
        courierName: string | null;
        rate: number | null;
        etd: string | null;
        error: string | null;
      }>;
      totalRate: number;
      quoteCount: number;
      failedCount: number;
    }>("/dashboard/shipping/bulk-shiprocket-quote", { orderIds }),
  bulkCreateShiprocketOrders: (
    orderIds: string[],
    pickupDate: string,
    selections?: Array<{
      orderId: string;
      courierId: number;
      courierName?: string;
    }>,
  ) =>
    apiPost<{
      succeeded: Array<{
        orderId: string;
        courierId: number;
        courierName: string;
        rate: number | null;
      }>;
      failed: Array<{ orderId: string; message: string }>;
      successCount: number;
      failedCount: number;
    }>("/dashboard/shipping/bulk-shiprocket", {
      orderIds,
      pickupDate,
      selections,
    }),
  getShiprocketLabel: (orderId: string) =>
    apiGet<{ labelUrl: string }>(`/dashboard/shipping/${orderId}/label`),
  getShiprocketInvoice: (orderId: string) =>
    apiGet<{ invoiceUrl: string }>(`/dashboard/shipping/${orderId}/invoice`),
  getShiprocketManifest: (orderId: string) =>
    apiGet<{ manifestUrl: string }>(`/dashboard/shipping/${orderId}/manifest`),
  trackQuickDelivery: (orderId: string) =>
    apiGet<Record<string, unknown>>(
      `/dashboard/shipping/${orderId}/quick-track`,
    ),
  cancelShiprocketShipment: (orderId: string) =>
    apiPost<Record<string, unknown>>(`/dashboard/shipping/${orderId}/cancel`),
};

export const adminProductService = {
  list: (params?: Record<string, string>, signal?: AbortSignal) =>
    apiGetPaginated<Product[]>("/products/admin/list", params, { signal }),
  getAll: async (params?: Record<string, string>) =>
    (await apiGetPaginated<Product[]>("/products/admin/list", params)).data,
  getById: (id: string) => apiGet<Product>(`/products/${id}`),
  create: (data: Record<string, unknown>) =>
    apiPost<Product>("/products", data),
  /** Atomic create: product + variants + images in one request/transaction */
  adminCreate: async (formData: FormData) => {
    const { data } = await api.post<ApiResponse<Product>>(
      "/products/admin-create",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    if (!data.data) throw new Error("Product create returned no data");
    return data.data;
  },
  update: (id: string, data: Record<string, unknown>) =>
    apiPut<Product>(`/products/${id}`, data),
  updateDuplicateSold: (id: string, baseSoldCount: number) =>
    apiPut<Product>(`/products/${id}`, { baseSoldCount }),
  updateColorStock: (colorId: string, availableStock: number) =>
    apiPatch(`/products/colors/${colorId}/stock`, { availableStock }),
  addColor: (productId: string, data: Record<string, unknown>) =>
    apiPost<Product>(`/products/${productId}/colors`, data),
  /** Atomic add-variant: color + images in one request/transaction */
  adminAddColor: async (productId: string, formData: FormData) => {
    const { data } = await api.post<ApiResponse<Product>>(
      `/products/${productId}/colors/admin-add`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    if (!data.data) throw new Error("Variant add returned no data");
    return data.data;
  },
  updateColor: (colorId: string, data: Record<string, unknown>) =>
    apiPatch<Product>(`/products/colors/${colorId}`, data),
  reorderColorImages: (colorId: string, orderedIds: string[]) =>
    apiPatch(`/products/colors/${colorId}/images/reorder`, { orderedIds }),
  updateStock: (inventoryId: string, quantity: number, reason?: string) =>
    apiPatch(`/products/inventory/${inventoryId}`, {
      quantity,
      reason: reason || "Admin stock update",
    }),
  delete: (id: string) => apiDelete(`/products/${id}`),
  deleteColorImage: (imageId: string) =>
    apiDelete(`/products/images/${imageId}`),
  uploadColorImages: async (colorId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    const { data } = await api.post<ApiResponse<ProductImage[]>>(
      `/products/colors/${colorId}/images`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data ?? [];
  },
  /** Atomic save: product fields + variants + images in one request/transaction */
  adminSave: async (id: string, formData: FormData) => {
    const { data } = await api.put<ApiResponse<Product>>(
      `/products/${id}/admin-save`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    if (!data.data) throw new Error("Product save returned no data");
    return data.data;
  },
};

export const adminCategoryService = {
  /** Non-deleted categories (active + hidden) */
  getAll: () => apiGet<Category[]>("/categories", { all: "true" }),
  list: (params?: Record<string, string>) =>
    apiGetPaginated<Category[]>("/categories", { all: "true", ...params }),
  /** Active storefront categories only */
  getActive: () => apiGet<Category[]>("/categories"),
  getById: (id: string) => apiGet<Category>(`/categories/${id}`),
  create: (data: Record<string, unknown>) =>
    apiPost<Category>("/categories", data),
  update: (id: string, data: Record<string, unknown>) =>
    apiPut<Category>(`/categories/${id}`, data),
  delete: (id: string) => apiDelete(`/categories/${id}`),
  unhide: (id: string) => apiPatch<Category>(`/categories/${id}/unhide`),
  uploadImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    await api.post(`/categories/${id}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const adminCouponService = {
  list: (params?: Record<string, string>) =>
    apiGetPaginated<Coupon[]>("/coupons", params),
  getAll: async (params?: Record<string, string>) =>
    (await apiGetPaginated<Coupon[]>("/coupons", params)).data,
  getById: (id: string) => apiGet<Coupon>(`/coupons/${id}`),
  create: (data: Record<string, unknown>) => apiPost<Coupon>("/coupons", data),
  update: (id: string, data: Record<string, unknown>) =>
    apiPut<Coupon>(`/coupons/${id}`, data),
  delete: (id: string) => apiDelete(`/coupons/${id}`),
};

export const adminBannerService = {
  getAll: () => apiGet<HeroBanner[]>("/hero-banners/all"),
  create: async (data: {
    title?: string;
    subtitle?: string;
    linkUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
    image: File;
    mobileImage?: File;
  }) => {
    const formData = new FormData();
    if (data.title) formData.append("title", data.title);
    if (data.subtitle) formData.append("subtitle", data.subtitle);
    if (data.linkUrl) formData.append("linkUrl", data.linkUrl);
    if (data.sortOrder !== undefined)
      formData.append("sortOrder", String(data.sortOrder));
    formData.append("isActive", String(data.isActive !== false));
    formData.append("image", data.image);
    if (data.mobileImage) formData.append("mobileImage", data.mobileImage);
    const response = await api.post("/hero-banners", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data as HeroBanner;
  },
  update: (id: string, data: Record<string, unknown>) =>
    apiPut<HeroBanner>(`/hero-banners/${id}`, data),
  delete: (id: string) => apiDelete(`/hero-banners/${id}`),
};

export const adminInstagramReelService = {
  getAll: () => apiGet<InstagramReel[]>("/instagram/reels/all"),
  create: (data: { videoUrl: string; sortOrder?: number; isActive?: boolean }) =>
    apiPost<InstagramReel>("/instagram/reels", data),
  update: (
    id: string,
    data: { videoUrl?: string; sortOrder?: number; isActive?: boolean },
  ) => apiPut<InstagramReel>(`/instagram/reels/${id}`, data),
  reorder: (orderedIds: string[]) =>
    apiPut<InstagramReel[]>("/instagram/reels/reorder", { orderedIds }),
  delete: (id: string) => apiDelete(`/instagram/reels/${id}`),
};

export const adminReviewService = {
  list: (params?: Record<string, string>) =>
    apiGetPaginated<CustomerReview[]>("/reviews/all", params),
  getAll: async (productId?: string) =>
    (
      await apiGetPaginated<CustomerReview[]>(
        "/reviews/all",
        productId ? { productId } : undefined,
      )
    ).data,
  create: async (data: {
    productId: string;
    customerName: string;
    rating: number;
    comment: string;
    isActive?: boolean;
    sortOrder?: number;
  }) => {
    const form = new FormData();
    form.append("productId", data.productId);
    form.append("customerName", data.customerName);
    form.append("rating", String(data.rating));
    form.append("comment", data.comment);
    form.append("isActive", String(data.isActive ?? true));
    if (data.sortOrder !== undefined)
      form.append("sortOrder", String(data.sortOrder));
    const { data: res } = await api.post<ApiResponse<CustomerReview>>(
      "/reviews",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data as CustomerReview;
  },
  update: (
    id: string,
    data: Partial<{
      productId: string;
      customerName: string;
      rating: number;
      comment: string;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) => apiPut<CustomerReview>(`/reviews/${id}`, data),
  delete: (id: string) => apiDelete(`/reviews/${id}`),
};

interface SettingRecord {
  key: string;
  value: unknown;
  group: string;
}

export type WhatsAppTemplateKind =
  | "order_placed"
  | "order_payment_pending"
  | "order_confirmed"
  | "order_ready_to_ship"
  | "order_shipped"
  | "order_in_transit"
  | "order_delivered"
  | "order_returned"
  | "order_cancelled"
  | "order_failed"
  | "order_rto"
  | "order_refunded"
  | "return_requested"
  | "return_accepted"
  | "return_rejected"
  | "return_out_for_pickup"
  | "return_pickup_cancelled"
  | "return_picked_up"
  | "return_completed"
  | "refund_coupon_issued"
  | "customer_welcome"
  | "customer_login_otp"
  | "marketing_text"
  | "marketing_image";

export type WhatsAppTemplateStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "IN_APPEAL"
  | "DELETED";

export interface WhatsAppTemplateRecord {
  kind: WhatsAppTemplateKind;
  name: string;
  language: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  headerText: string;
  body: string;
  footer: string;
  examples: string[];
  variableLabels: string[];
  headerHandle?: string;
  headerPreviewUrl?: string;
  status: WhatsAppTemplateStatus;
  isActive: boolean;
  metaTemplateId?: string;
  rejectionReason?: string;
  submittedAt?: string;
  lastSyncedAt?: string;
}

export const adminSettingsService = {
  getAll: (group?: string) =>
    apiGet<SettingRecord[]>("/settings", group ? { group } : undefined),
  update: (settings: Array<{ key: string; value: unknown; group?: string }>) =>
    apiPut<SettingRecord[]>("/settings", { settings }),
  getOurStoryImage: () =>
    apiGet<{ imageUrl: string | null; publicId: string | null }>(
      "/settings/our-story/image",
    ),
  uploadOurStoryImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    await api.post("/settings/our-story/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteOurStoryImage: () => apiDelete("/settings/our-story/image"),
  getInvoiceSignature: () =>
    apiGet<{ imageUrl: string | null; publicId: string | null }>(
      "/settings/signature",
    ),
  saveInvoiceSignature: (dataUrl: string) =>
    apiPut<{ imageUrl: string | null; publicId: string | null }>(
      "/settings/signature",
      { dataUrl },
    ),
  deleteInvoiceSignature: () => apiDelete("/settings/signature"),
  getWhatsAppTemplates: () =>
    apiGet<WhatsAppTemplateRecord[]>("/settings/whatsapp-templates"),
  saveWhatsAppTemplate: (
    kind: WhatsAppTemplateKind,
    data: Pick<
      WhatsAppTemplateRecord,
      | "name"
      | "language"
      | "headerText"
      | "body"
      | "footer"
      | "examples"
      | "headerHandle"
      | "headerPreviewUrl"
    >,
  ) =>
    apiPut<WhatsAppTemplateRecord>(
      `/settings/whatsapp-templates/${kind}`,
      data,
    ),
  uploadWhatsAppTemplateImage: async (
    kind: WhatsAppTemplateKind,
    file: File,
  ) => {
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await api.post<ApiResponse<WhatsAppTemplateRecord>>(
      `/settings/whatsapp-templates/${kind}/sample-image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data!;
  },
  submitWhatsAppTemplate: (kind: WhatsAppTemplateKind) =>
    apiPost<WhatsAppTemplateRecord>(
      `/settings/whatsapp-templates/${kind}/submit`,
    ),
  syncWhatsAppTemplate: (kind: WhatsAppTemplateKind) =>
    apiPost<WhatsAppTemplateRecord>(
      `/settings/whatsapp-templates/${kind}/sync`,
    ),
  setWhatsAppTemplateActive: (kind: WhatsAppTemplateKind, isActive: boolean) =>
    apiPatch<WhatsAppTemplateRecord>(
      `/settings/whatsapp-templates/${kind}/active`,
      { isActive },
    ),
};

export const adminCustomerService = {
  list: (params?: Record<string, string>) =>
    apiGetPaginated<StoreCustomer[]>("/customers", params),
  getAll: async (params?: Record<string, string>) =>
    (await apiGetPaginated<StoreCustomer[]>("/customers", params)).data,
  getById: (id: string) => apiGet<StoreCustomer>(`/customers/${id}`),
  create: (data: Record<string, unknown>) =>
    apiPost<StoreCustomer>("/customers", data),
  update: (id: string, data: Record<string, unknown>) =>
    apiPatch<StoreCustomer>(`/customers/${id}`, data),
  delete: (id: string) => apiDelete(`/customers/${id}`),
  syncFromOrders: () =>
    apiPost<{ synced: number; total: number }>("/customers/sync-orders"),
};

export const adminMarketingService = {
  getTemplates: () => apiGet<MarketingTemplate[]>("/marketing/templates"),
  preview: (data: { heading: string; story: string; sampleName?: string }) =>
    apiPost<{ message: string }>("/marketing/preview", data),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await api.post<ApiResponse<{ imageUrl: string }>>(
      "/marketing/upload-image",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data!;
  },
  send: (data: Record<string, unknown>) =>
    apiPost<{
      sentCount: number;
      failedCount: number;
      recipientCount: number;
    }>("/marketing/send", data),
  getCampaigns: () => apiGet<MarketingCampaign[]>("/marketing/campaigns"),
};

export const adminEmailMarketingService = {
  getTemplates: () =>
    apiGet<EmailMarketingTemplate[]>("/email-marketing/templates"),
  preview: (data: {
    subject: string;
    heading: string;
    body: string;
    imageUrl?: string;
    sampleName?: string;
  }) =>
    apiPost<{ subject: string; html: string; text: string }>(
      "/email-marketing/preview",
      data,
    ),
  eligibility: (data: { customerIds?: string[]; sendToAll?: boolean }) =>
    apiPost<{ eligibleCount: number; skippedCount: number }>(
      "/email-marketing/eligibility",
      data,
    ),
  send: (data: {
    templateKey: string;
    subject: string;
    heading: string;
    body: string;
    imageUrl?: string;
    customerIds?: string[];
    sendToAll?: boolean;
  }) =>
    apiPost<{ campaignId: string; status: string; recipientCount: number }>(
      "/email-marketing/send",
      data,
    ),
  getCampaigns: () =>
    apiGet<EmailMarketingCampaign[]>("/email-marketing/campaigns"),
};

export const adminReturnRequestService = {
  getAll: (params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => apiGetPaginated<ReturnRequest[]>("/return-requests", params),
  getById: (id: string) => apiGet<ReturnRequest>(`/return-requests/${id}`),
  updateStatus: (
    id: string,
    data: { status: string; adminNotes?: string; force?: boolean },
  ) => apiPatch<ReturnRequest>(`/return-requests/${id}/status`, data),
  adminCreate: (data: {
    orderId: string;
    reason: string;
    items: Array<{ orderItemId: string; quantity: number }>;
    adminNotes?: string;
    initialStatus?: string;
    force?: boolean;
  }) => apiPost<ReturnRequest>("/return-requests/admin", data),
};

export const adminRefundService = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    filter?: "all" | "pending" | "completed";
    startDate?: string;
    endDate?: string;
  }) => apiGetPaginated<RefundEligibleOrder[]>("/refunds", params),
  process: (
    orderId: string,
    data: { deduction: number; couponAmount: number; force?: boolean },
  ) =>
    apiPost<RefundEligibleOrder & { couponCode?: string }>(
      `/refunds/${orderId}/process`,
      data,
    ),
};
