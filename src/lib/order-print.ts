import { adminOrderService, adminSettingsService } from '@/services/admin.service';
import { formatPrice, formatDate, formatTime, getOrderStatusLabel, formatCustomerName, formatPaymentMethodLabel, formatCouponDiscountLabel, formatShortOrderNumber } from '@/lib/utils';

const BRAND = 'SINGARI SAREES';
const ADDRESS = 'Flat no:306, Floor:3, Sumadhura Prestige Apartments, Doctors Colony, Road no:6, Hyderabad-500035';
const PHONE = '+91 94904 58789';
const EMAIL = 'singarisaree@gmail.com';

function getPrintColor(item: { colorName: string; productColor?: { name: string } }): string {
  return item.productColor?.name?.trim() || item.colorName;
}

function buildAddress(address: { addressLine1: string; addressLine2?: string; landmark?: string; city: string; state: string; postalCode: string }) {
  const parts = [address.addressLine1, address.addressLine2, address.landmark, address.city, address.state, address.postalCode].filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const normalized = part!.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalized) continue;
    let isDuplicate = false;
    for (const s of seen) {
      if (s.includes(normalized) || normalized.includes(s)) { isDuplicate = true; break; }
    }
    if (!isDuplicate) {
      unique.push(part!.trim());
      seen.add(normalized);
    }
  }
  return unique.join(', ');
}

function openPrintWindow(html: string) {
  const existing = document.getElementById('print-frame');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };
}

export async function printOrderReport(orderIds: string[], status: string) {
  const orders = await adminOrderService.getByIds(orderIds);
  if (orders.length === 0) return;

  const totalQty = orders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
  const rows = orders.flatMap((order, orderIndex) =>
    order.items.map((item, itemIndex) => {
      const first = itemIndex === 0;
      const last = itemIndex === order.items.length - 1;
      const rowSpan = order.items.length;
      return `<tr class="${first ? 'order-start' : 'product-divider'} ${last ? 'order-end' : ''}">
        ${first ? `
        <td rowspan="${rowSpan}" class="order-info">${orderIndex + 1}</td>
        <td rowspan="${rowSpan}" class="order-info">${formatShortOrderNumber(order.orderNumber)}</td>
        <td rowspan="${rowSpan}" class="order-info">${formatDate(order.createdAt)}</td>
        <td rowspan="${rowSpan}" class="order-info">${formatCustomerName(order.customerName)}</td>
        <td rowspan="${rowSpan}" class="order-info">${order.customerPhone}</td>` : ''}
        <td>${item.productName}</td>
        <td>${getPrintColor(item)}</td>
        <td>${item.sku}</td>
        <td>${item.quantity}</td>
        <td>${formatPrice(item.unitPrice)}</td>
        <td>${formatPrice(item.totalPrice)}</td>
        ${first ? `
        <td rowspan="${rowSpan}" class="order-info">${order.payments?.[0]?.status || 'Pending'}</td>
        <td rowspan="${rowSpan}" class="order-info">${getOrderStatusLabel(order.status)}</td>` : ''}
      </tr>`;
    }),
  );

  const statusLabel = status === 'ALL' ? 'All Orders' : getOrderStatusLabel(status);
  const now = new Date();

  const html = `<!DOCTYPE html><html><head><title>Order Report - ${BRAND}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #1a1a1a; }
  .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #0f172a; }
  .header h1 { font-size: 20px; letter-spacing: 2px; margin-bottom: 4px; }
  .header h2 { font-size: 14px; color: #475569; font-weight: normal; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
  .meta span { font-size: 11px; }
  .meta strong { color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; }
  th { background: #0f172a; color: white; font-weight: 600; white-space: nowrap; }
  thead th { border: 1px solid #0f172a; }
  .order-start td { border-top: 2px solid #64748b; }
  .product-divider td { border-top: 1px solid #cbd5e1; }
  .order-end td { border-bottom: 2px solid #64748b; }
  .order-info { vertical-align: middle; background: #f8fafc; }
  .summary { margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; }
  .summary h3 { background: #0f172a; color: white; padding: 8px 12px; font-size: 12px; }
  .summary table { margin: 0; }
  .summary td { border: none; border-bottom: 1px solid #f1f5f9; padding: 8px 12px; }
  .summary td:first-child { font-weight: 600; width: 200px; }
  @media print { body { padding: 10px; } }
</style></head><body>
<div class="header">
  <h1>${BRAND}</h1>
  <h2>ORDER REPORT</h2>
</div>
<div class="meta">
  <span>Order Status: <strong>${statusLabel}</strong></span>
  <span>Generated On: <strong>${formatDate(now.toISOString())} ${formatTime(now.toISOString())}</strong></span>
  <span>Total Orders: <strong>${orders.length}</strong></span>
</div>
<table>
  <thead><tr>
    <th>S.No</th><th>Order ID</th><th>Date</th><th>Customer</th><th>Phone</th>
    <th>Product</th><th>Variant</th><th>SKU</th><th>Qty</th><th>Unit Price</th>
    <th>Line Total</th><th>Payment</th><th>Status</th>
  </tr></thead>
  <tbody>${rows.join('')}</tbody>
</table>
<div class="summary">
  <h3>Report Summary</h3>
  <table>
    <tr><td>Total Selected Orders</td><td>${orders.length}</td></tr>
    <tr><td>Total Quantity</td><td>${totalQty}</td></tr>
    <tr><td>Total Sales Amount</td><td>${formatPrice(totalAmount)}</td></tr>
    <tr><td>Report Status</td><td>${statusLabel}</td></tr>
  </table>
</div>
</body></html>`;

  openPrintWindow(html);
}

export async function printInvoices(orderIds: string[]) {
  const [orders, signature] = await Promise.all([
    adminOrderService.getByIds(orderIds),
    adminSettingsService.getInvoiceSignature().catch(() => ({ imageUrl: null, publicId: null })),
  ]);

  if (orders.length === 0) return;

  const logoUrl = `${window.location.origin}/logo-navbar.png`;
  const signatureUrl = signature.imageUrl;
  const signatureBlock = signatureUrl
    ? `<img src="${signatureUrl}" alt="Signature" class="signature-img" />`
    : '<div class="signature-line"></div>';

  const invoices = orders.map((order, idx) => {
    const shortId = formatShortOrderNumber(order.orderNumber);
    const invoiceNo = `INV-${shortId.replace(/[^A-Z0-9]/gi, '') || String(idx + 1).padStart(4, '0')}`;
    const itemRows = order.items.map((item) =>
      `<tr>
        <td>${item.productName} (${getPrintColor(item)})</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${formatPrice(item.unitPrice)}</td>
        <td class="right">${formatPrice(item.totalPrice)}</td>
      </tr>`
    ).join('');

    const fullAddress = buildAddress(order.shippingAddress);

    return `<div class="invoice ${idx > 0 ? 'page-break' : ''}">
      <div class="inv-header">
        <img src="${logoUrl}" alt="Singari Sarees" class="invoice-logo" />
        <h1>${BRAND}</h1>
        <p class="brand-address">${ADDRESS}</p>
        <p class="brand-contact">${PHONE} | ${EMAIL}</p>
      </div>
      <div class="inv-meta">
        <div class="inv-meta-left">
          <p class="section-heading"><strong>Customer Details</strong></p>
          <table class="meta-table">
            <tr><td class="meta-label">Name:</td><td><strong>${formatCustomerName(order.customerName)}</strong></td></tr>
            <tr><td class="meta-label">Address:</td><td>${fullAddress}</td></tr>
            <tr><td class="meta-label">Phone:</td><td>${order.customerPhone}</td></tr>
          </table>
        </div>
        <div class="inv-meta-right">
          <table class="meta-table">
            <tr><td class="meta-label">Invoice No:</td><td>${invoiceNo}</td></tr>
            <tr><td class="meta-label">Date:</td><td>${formatDate(order.createdAt)}</td></tr>
            <tr><td class="meta-label">Order No:</td><td>${formatShortOrderNumber(order.orderNumber)}</td></tr>
          </table>
        </div>
      </div>
      <table class="inv-table">
        <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="inv-totals">
        <div class="total-row"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
        ${order.discountAmount > 0 ? `<div class="total-row"><span>${formatCouponDiscountLabel({
          couponCode: order.couponCode,
          isRefundCoupon: order.coupon?.isRefundCoupon,
        })}</span><span>-${formatPrice(order.discountAmount)}</span></div>` : ''}
        ${order.shippingCharge > 0 ? `<div class="total-row"><span>Shipping</span><span>${formatPrice(order.shippingCharge)}</span></div>` : ''}
        ${order.taxAmount > 0 ? `<div class="total-row"><span>GST</span><span>${formatPrice(order.taxAmount)}</span></div>` : ''}
        <div class="total-row grand"><span>Grand Total</span><span>${formatPrice(Number(order.grandTotal))}</span></div>
      </div>
      <div class="inv-footer">
        <div class="inv-footer-left">
          <p>Payment: ${formatPaymentMethodLabel(order.payments?.[0], {
            couponCode: order.couponCode,
            grandTotal: order.grandTotal,
          })} (${order.payments?.[0]?.status || 'Pending'})</p>
          <p class="thanks">Thank you for shopping with us!</p>
        </div>
        <div class="inv-signature">
          <div class="signature-box">${signatureBlock}</div>
          <span class="signature-label">Signature</span>
        </div>
      </div>
      <p class="inv-note">Note: This is a system generated invoice. Physical signature is not required.</p>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>Invoice - ${BRAND}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; color: #1a1a1a; }
  .invoice { border: 2px solid #0f172a; padding: 25px; max-width: 700px; margin: 0 auto; }
  .page-break { page-break-before: always; margin-top: 30px; }
  .inv-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 15px; }
  .invoice-logo { display: block; width: auto; height: 58px; max-width: 230px; object-fit: contain; margin: 0 auto 8px; }
  .inv-header h1 { font-size: 22px; letter-spacing: 3px; margin-bottom: 5px; }
  .inv-header .brand-address { font-size: 11px; color: #475569; }
  .inv-header .brand-contact { font-size: 11px; color: #475569; margin-top: 3px; }
  .inv-meta { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
  .inv-meta-left, .inv-meta-right { font-size: 11px; line-height: 1.6; }
  .inv-meta-right { text-align: left; }
  .section-heading { font-size: 12px; margin-bottom: 4px; color: #0f172a; }
  .meta-table { border: none; border-collapse: collapse; }
  .meta-table td { border: none; padding: 2px 8px 2px 0; vertical-align: top; font-size: 11px; }
  .meta-table .meta-label { font-weight: 600; color: #475569; white-space: nowrap; }
  .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  .inv-table th, .inv-table td { border: 1px solid #cbd5e1; padding: 8px 10px; }
  .inv-table th { background: #0f172a; color: white; font-weight: 600; font-size: 11px; }
  .inv-table td { font-size: 11px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .inv-totals { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 15px; margin-bottom: 15px; max-width: 280px; margin-left: auto; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
  .total-row.grand { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 13px; }
  .inv-footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #64748b; }
  .inv-footer-left { text-align: left; }
  .inv-footer .thanks { margin-top: 8px; font-style: italic; color: #0f172a; }
  .inv-signature { display: flex; flex-direction: column; align-items: center; width: 160px; flex-shrink: 0; margin-left: auto; }
  .signature-label { font-size: 11px; font-weight: 600; color: #0f172a; text-align: center; width: 100%; line-height: 1.2; margin-top: 4px; }
  .signature-box { display: flex; align-items: flex-end; justify-content: center; width: 100%; min-height: 56px; }
  .signature-img { max-height: 56px; max-width: 160px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto; }
  .signature-line { width: 100%; height: 1px; background: #0f172a; margin-bottom: 4px; }
  .inv-note { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; font-style: italic; }
  @media print { body { padding: 0; } .invoice { border: 2px solid #000; } }
</style></head><body>${invoices}</body></html>`;

  openPrintWindow(html);
}

/** Opens official Shiprocket label PDFs only — no homemade HTML labels. */
export async function openShiprocketLabels(orderIds: string[]) {
  const opened: string[] = [];
  const failed: string[] = [];

  for (const orderId of orderIds) {
    try {
      const { labelUrl } = await adminOrderService.getShiprocketLabel(orderId);
      if (!labelUrl) {
        failed.push(orderId);
        continue;
      }
      window.open(labelUrl, '_blank', 'noopener,noreferrer');
      opened.push(orderId);
    } catch {
      failed.push(orderId);
    }
  }

  if (opened.length === 0) {
    throw new Error(
      'No Shiprocket labels available. Create shipment (AWB) in Shiprocket before opening labels.',
    );
  }

  return { opened: opened.length, failed: failed.length };
}
