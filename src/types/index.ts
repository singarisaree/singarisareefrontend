export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  seoTitle?: string;
  seoDesc?: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  url: string;
  highResUrl?: string;
  altText?: string;
  sortOrder: number;
  isDefault: boolean;
}

export interface ProductColor {
  id: string;
  name: string;
  hexCode?: string;
  instagramVideoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  images: ProductImage[];
  inventoryId?: string;
  quantity?: number;
  reserved?: number;
  availableStock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  description: string;
  productDetails?: string | null;
  fabric?: string;
  care?: string;
  shippingInfo?: string;
  returnPolicy?: string;
  price: number;
  mrp: number;
  discount: number;
  effectivePrice: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  tags: string[];
  soldCount: number;
  baseSoldCount: number;
  displaySoldCount: number;
  isActive: boolean;
  isComingSoon?: boolean;
  isFeatured: boolean;
  defaultImage?: string;
  totalStock: number;
  isOutOfStock?: boolean;
  colors: ProductColor[];
  relatedProducts?: Product[];
  seoTitle?: string;
  seoDesc?: string;
  createdAt?: string;
}

export interface HeroBanner {
  id: string;
  title?: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CustomerReview {
  id: string;
  productId?: string;
  customerName: string;
  rating: number;
  comment: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  product?: { id: string; name: string; slug?: string };
}

export interface InstagramFeed {
  id: string;
  imageUrl: string;
  caption?: string;
  linkUrl?: string;
}

export interface InstagramReel {
  id: string;
  videoUrl: string;
  publicId?: string;
  instagramUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  productColorId: string;
  productName: string;
  colorName: string;
  slug: string;
  imageUrl: string;
  price: number;
  mrp: number;
  quantity: number;
  maxStock: number;
}

export interface CartSyncResult {
  items: CartItem[];
  removed: Array<{ productColorId: string; productName: string; reason: string }>;
  adjusted: Array<{ productColorId: string; productName: string; from: number; to: number }>;
}

export interface ShippingAddress {
  country: string;
  countryCode?: string;
  state: string;
  city: string;
  postalCode: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  preferredShipping?: 'QUICK' | 'STANDARD';
}

export interface ShippingQuoteResult {
  success: boolean;
  courier?: string;
  shippingFee?: number;
  estimatedDays?: string;
  currency?: string;
  message?: string;
}

export interface QuickQuoteResult {
  available: boolean;
  rate?: number;
  etaMinutes?: string | null;
  currency?: string;
  courierName?: string | null;
  message?: string;
}

export interface ShippingCountryOption {
  id: number;
  name: string;
  isoCode: string;
  dialCode: string;
  postcodeRequired: boolean;
  postalRegex: string | null;
}

export interface OrderItem {
  id: string;
  productName: string;
  colorName: string;
  sku: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  product?: {
    weight?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
  };
}

export interface ShipmentInfo {
  method: string;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  awbCode?: string;
  labelUrl?: string;
  manifestUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface ShipmentHistoryRecord extends ShipmentInfo {
  id: string;
  archivedAt: string;
  reason?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  grandTotal: number;
  couponCode?: string;
  coupon?: {
    id?: string;
    code?: string;
    type?: string;
    value?: number;
    isRefundCoupon?: boolean;
  } | null;
  estimatedDelivery?: string;
  notes?: string | null;
  packageLength?: number | null;
  packageWidth?: number | null;
  packageHeight?: number | null;
  items: OrderItem[];
  shipping?: ShipmentInfo;
  shipmentHistory?: ShipmentHistoryRecord[];
  trackingHistory?: Array<{
    status: string;
    description?: string;
    location?: string;
    timestamp: string;
  }>;
  payments?: Array<{ status: string; method: string; transactionId?: string | null }>;
  returnRequests?: ReturnRequest[];
  createdAt: string;
  updatedAt?: string;
  refundDeduction?: number | null;
  refundAmount?: number | null;
  refundUtr?: string | null;
  refundCouponId?: string | null;
  refundCouponCode?: string | null;
  refundedAt?: string | null;
}

export type ReturnRequestStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'OUT_FOR_PICKUP'
  | 'PICKUP_CANCELLED'
  | 'PICKED_UP'
  | 'RETURNED';

export interface ReturnRequestImage {
  id: string;
  url: string;
  publicId: string;
  sortOrder: number;
}

export interface ReturnRequestTrackingEntry {
  id: string;
  status: string;
  description?: string | null;
  timestamp: string;
}

export interface ReturnRequestItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  quantity: number;
  orderItem?: {
    id: string;
    productName: string;
    colorName: string;
    sku: string;
    imageUrl?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerPhone: string;
  reason: string;
  phonePeNumber?: string | null;
  phonePeAccountName?: string | null;
  status: ReturnRequestStatus;
  adminNotes?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  pickedUpAt?: string | null;
  pickupCancelledAt?: string | null;
  returnedAt?: string | null;
  refundCouponId?: string | null;
  refundCouponCode?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: ReturnRequestItem[];
  images: ReturnRequestImage[];
  trackingHistory?: ReturnRequestTrackingEntry[];
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    customerPhone: string;
    grandTotal: number;
    createdAt: string;
    updatedAt?: string;
    shipping?: { deliveredAt?: string | null };
  };
}

export const RETURN_REASONS = [
  'Wrong item received',
  'Defective or damaged product',
  'Color or design mismatch',
  'Quality not as expected',
  'Changed my mind',
  'Other',
] as const;

export interface RefundEligibleOrder {
  id: string;
  orderNumber: string;
  status: string;
  refundType: 'CANCELLATION' | 'RETURN' | 'OTHER';
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  eligibleAmount?: number;
  shippingCharge?: number;
  paymentStatus: string | null;
  paymentMethod: string | null;
  createdAt: string;
  cancelledAt?: string | null;
  returnedAt?: string | null;
  returnRequestId?: string | null;
  isRefunded?: boolean;
  refundAmount?: number | null;
  refundDeduction?: number | null;
  refundCouponCode?: string | null;
  couponCode?: string | null;
  refundedAt?: string | null;
}

export interface CheckoutFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
}

export interface OrderTotals {
  orderItems: OrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  grandTotal: number;
  estimatedDelivery: string;
  shippingQuote?: ShippingQuoteResult;
}

export interface DispatchRecord {
  id: string;
  shippingId: string;
  orderNumber: string;
  orderStatus: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  courierPartner: string | null;
  method: string;
  awbCode: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shiprocketShipmentId: string | null;
  shippedAt: string | null;
  dispatchedAt: string;
  orderCreatedAt: string;
}

export interface CourierPartnerTab {
  key: string;
  label: string;
  count: number;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  minOrderAmount: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
  allowedPhone?: string | null;
  sourceOrderId?: string | null;
  isRefundCoupon?: boolean;
}

export interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  paymentPending: number;
  confirmed: number;
  readyToShip: number;
  shipped: number;
  inTransit: number;
  deliveredOrders: number;
  cancelledOrders: number;
  failed: number;
  rto: number;
  returned: number;
  refunded: number;
  placed: number;
  activeProducts: number;
  outOfStockCount: number;
  openReturnRequests: number;
  orderPipeline: Array<{ status: string; count: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    soldCount: number;
    price: number;
  }>;
  lowStock: Array<{
    id: string;
    quantity: number;
    product: { name: string; sku: string };
    productColor: { name: string };
  }>;
  salesByMonth: Array<{ month: string; revenue: number }>;
}

export interface PublicSettings {
  store_name?: string;
  store_tagline?: string;
  store_email?: string;
  store_phone?: string;
  store_address?: string;
  instagram_url?: string;
  facebook_url?: string;
  whatsapp_number?: string;
  default_shipping_charge?: number;
  free_shipping_threshold?: number;
  free_shipping_enabled?: boolean;
  announcement_bar_enabled?: boolean | string;
  announcement_bar_text?: string;
  announcement_bar_secondary_text?: string;
  estimated_delivery_days?: number;
  our_story_image_url?: string;
}

export interface StoreCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  source: 'ORDER' | 'MANUAL' | 'VIP';
  notes?: string | null;
  allowMarketing: boolean;
  createdAt: string;
  updatedAt: string;
  orderCount?: number;
  marketingMessageCount?: number;
  latestMarketingMessage?: {
    id: string;
    status: 'SENT' | 'FAILED' | 'SKIPPED';
    createdAt: string;
    campaignHeading: string;
  } | null;
  marketingMessages?: Array<{
    id: string;
    status: 'SENT' | 'FAILED' | 'SKIPPED';
    errorMessage?: string | null;
    createdAt: string;
    acceptedAt?: string | null;
    deliveredAt?: string | null;
    failedAt?: string | null;
    campaignHeading: string;
    templateKey: string;
  }>;
  orders?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    items: Array<{
      productName: string;
      colorName: string;
      quantity: number;
      totalPrice: number;
    }>;
  }>;
}

export interface MarketingTemplate {
  key: string;
  name: string;
  description: string;
  heading: string;
  story: string;
  campaignLink: string;
}

export interface MarketingCampaign {
  id: string;
  templateKey: string;
  heading: string;
  story: string;
  campaignLink?: string | null;
  imageUrl?: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  /** Count of messages Meta marked delivered (needs webhook). */
  deliveredCount?: number;
  failedAfterAccept?: number;
  recentErrors?: string[];
  createdAt: string;
  createdByAdmin?: { name: string } | null;
}

export interface EmailMarketingTemplate {
  key: string;
  name: string;
  description: string;
  subject: string;
  heading: string;
  body: string;
}

export interface EmailMarketingCampaign {
  id: string;
  subject: string;
  heading: string;
  body: string;
  imageUrl?: string | null;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdmin?: { name: string } | null;
}
