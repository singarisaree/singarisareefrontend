"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, ShieldAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  adminOrderService,
  adminRefundService,
  adminReturnRequestService,
} from "@/services/admin.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { refreshAdminOrderLists } from "@/lib/refresh-admin-order-lists";
import {
  formatPrice,
  formatDate,
  formatTime,
  formatDateTime,
  formatShortOrderNumber,
  getOrderStatusLabel,
  getReturnRequestStatusLabel,
  formatPaymentMethodLabel,
  formatCustomerName,
} from "@/lib/utils";
import type { Order, ReturnRequestStatus, ShippingAddress } from "@/types";
import { RETURN_REASONS } from "@/types";
import {
  StatusBadge,
  orderStatusVariant,
} from "@/components/admin/status-badge";
import { CreateShipmentDialog } from "@/components/admin/create-shipment-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AdminDetailAside,
  AdminDetailGrid,
  AdminDetailInfo,
  AdminDetailMain,
  AdminDetailSection,
  AdminDetailShell,
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from "@/components/admin/admin-detail";

const ALL_STATUSES = [
  "PLACED",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "DELIVERED",
  "RETURNED",
  "REFUNDED",
  "CANCELLED",
  "FAILED",
  "RTO",
] as const;

const ALL_RETURN_STATUSES: ReturnRequestStatus[] = [
  "REQUESTED",
  "ACCEPTED",
  "REJECTED",
  "OUT_FOR_PICKUP",
  "PICKUP_CANCELLED",
  "PICKED_UP",
  "RETURNED",
];

const emptyAddress: ShippingAddress = {
  country: "India",
  state: "",
  city: "",
  postalCode: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
};

function statusReachedAt(row: {
  status: string;
  updatedAt: string;
  createdAt: string;
  refundedAt?: string | null;
  trackingHistory?: Array<{ status: string; timestamp: string }>;
}): string {
  if (row.status === "REFUNDED" && row.refundedAt) return row.refundedAt;
  const fromTracking = row.trackingHistory?.find(
    (entry) => entry.status === row.status,
  )?.timestamp;
  return fromTracking || row.updatedAt || row.createdAt;
}

export default function AdminEscalationPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shipmentOpen, setShipmentOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [clearRefundMarkers, setClearRefundMarkers] = useState(false);
  const [shippingAddress, setShippingAddress] =
    useState<ShippingAddress>(emptyAddress);
  const [couponAmount, setCouponAmount] = useState("");
  const [deduction, setDeduction] = useState("0");

  const [returnReason, setReturnReason] = useState<string>(RETURN_REASONS[0]);
  const [returnCustomReason, setReturnCustomReason] = useState("");
  const [returnInitialStatus, setReturnInitialStatus] =
    useState<ReturnRequestStatus>("ACCEPTED");
  const [returnAdminNotes, setReturnAdminNotes] = useState("");
  const [returnQtyByItem, setReturnQtyByItem] = useState<
    Record<string, number>
  >({});
  const [rrStatusById, setRrStatusById] = useState<
    Record<string, ReturnRequestStatus>
  >({});
  const [rrNotesById, setRrNotesById] = useState<Record<string, string>>({});

  const [manualCourier, setManualCourier] = useState("");
  const [manualTracking, setManualTracking] = useState("");
  const [manualTrackingUrl, setManualTrackingUrl] = useState("");

  const detailRef = useRef<HTMLDivElement>(null);

  const searchQuery = useQuery({
    queryKey: ["admin-escalation-search", submittedQuery],
    queryFn: () => adminOrderService.searchEscalation(submittedQuery),
    enabled: submittedQuery.trim().length >= 1,
  });

  const orderQuery = useQuery({
    queryKey: ["admin-escalation-order", selectedId],
    queryFn: ({ signal }) => adminOrderService.getById(selectedId!, signal),
    enabled: Boolean(selectedId),
    retry: 1,
  });

  const order = orderQuery.data;
  const results = searchQuery.data ?? [];
  const selectedSummary = useMemo(
    () => results.find((row) => row.id === selectedId) ?? null,
    [results, selectedId],
  );

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [selectedId]);

  useEffect(() => {
    if (!order) return;
    setCustomerName(order.customerName || "");
    setCustomerPhone(order.customerPhone || "");
    setCustomerEmail(order.customerEmail || "");
    setStatus(order.status);
    setNotes((order as Order & { notes?: string }).notes || "");
    setClearRefundMarkers(false);
    setReason("");
    setShippingAddress({
      ...emptyAddress,
      ...(order.shippingAddress as ShippingAddress | undefined),
    });
    const merchandiseCap = Math.max(
      0,
      Number(order.subtotal ?? 0) - Number(order.discountAmount ?? 0),
    );
    const openReturn = (order.returnRequests ?? []).find(
      (rr) => !rr.refundCouponId && rr.status !== "REJECTED",
    );
    const returnItemsCap =
      openReturn?.items?.reduce((sum, item) => {
        const unit = Number(item.orderItem?.unitPrice ?? 0);
        return sum + unit * item.quantity;
      }, 0) ?? null;
    const eligible =
      returnItemsCap != null && returnItemsCap > 0
        ? Math.min(returnItemsCap, merchandiseCap)
        : merchandiseCap;
    setCouponAmount(String(eligible || Number(order.grandTotal) || ""));
    setDeduction("0");
    setReturnReason(RETURN_REASONS[0]);
    setReturnCustomReason("");
    setReturnInitialStatus("ACCEPTED");
    setReturnAdminNotes("");
    setReturnQtyByItem(
      Object.fromEntries(order.items.map((item) => [item.id, item.quantity])),
    );
    const rrs = order.returnRequests ?? [];
    setRrStatusById(
      Object.fromEntries(
        rrs.map((rr) => [rr.id, rr.status as ReturnRequestStatus]),
      ),
    );
    setRrNotesById(
      Object.fromEntries(rrs.map((rr) => [rr.id, rr.adminNotes || ""])),
    );
    setManualCourier(order.shipping?.courierName || "");
    setManualTracking(order.shipping?.trackingNumber || "");
    setManualTrackingUrl(order.shipping?.trackingUrl || "");
  }, [order]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !order) throw new Error("No order selected");
      const payload: Record<string, unknown> = {};
      if (customerName.trim() !== order.customerName)
        payload.customerName = customerName.trim();
      if (customerPhone.trim() !== order.customerPhone)
        payload.customerPhone = customerPhone.trim();
      if (customerEmail.trim() !== (order.customerEmail || "")) {
        payload.customerEmail = customerEmail.trim();
      }
      if (status !== order.status) payload.status = status;
      const existingNotes = (order as Order & { notes?: string }).notes || "";
      if (notes.trim() !== existingNotes) payload.notes = notes.trim();
      if (clearRefundMarkers) payload.clearRefundMarkers = true;
      if (reason.trim()) payload.reason = reason.trim();

      const prev = order.shippingAddress as ShippingAddress;
      const addrChanged =
        shippingAddress.addressLine1 !== (prev?.addressLine1 || "") ||
        shippingAddress.addressLine2 !== (prev?.addressLine2 || "") ||
        shippingAddress.city !== (prev?.city || "") ||
        shippingAddress.state !== (prev?.state || "") ||
        shippingAddress.postalCode !== (prev?.postalCode || "") ||
        shippingAddress.country !== (prev?.country || "") ||
        (shippingAddress.landmark || "") !== (prev?.landmark || "");
      if (addrChanged) payload.shippingAddress = shippingAddress;

      if (Object.keys(payload).length === 0) {
        throw new Error("NO_CHANGES");
      }
      if (payload.status && !reason.trim()) {
        throw new Error("REASON_REQUIRED");
      }
      return adminOrderService.applyEscalation(selectedId, payload);
    },
    onSuccess: (updated) => {
      toast.success("Escalation applied");
      queryClient.setQueryData(["admin-escalation-order", selectedId], updated);
      void queryClient.invalidateQueries({
        queryKey: ["admin-escalation-search"],
      });
      refreshAdminOrderLists(queryClient);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "NO_CHANGES") {
        toast.info("No changes to apply");
        return;
      }
      if (error instanceof Error && error.message === "REASON_REQUIRED") {
        toast.error("Enter a reason when changing status");
        return;
      }
      toast.error(getApiErrorMessage(error, "Escalation failed"));
    },
  });

  const refundMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("No order");
      const amount = Number(couponAmount);
      const deduct = Number(deduction) || 0;
      if (!(amount > 0)) throw new Error("INVALID_AMOUNT");
      return adminRefundService.process(selectedId, {
        couponAmount: amount,
        deduction: deduct,
        force: true,
      });
    },
    onSuccess: (result) => {
      toast.success(
        result.couponCode
          ? `Store credit issued: ${result.couponCode}`
          : "Store credit coupon issued",
      );
      void orderQuery.refetch();
      void queryClient.invalidateQueries({
        queryKey: ["admin-escalation-search"],
      });
      refreshAdminOrderLists(queryClient);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "INVALID_AMOUNT") {
        toast.error("Enter a valid coupon amount");
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not issue coupon"));
    },
  });

  const arrangeReturnMutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !order) throw new Error("No order");
      const items = order.items
        .map((item) => ({
          orderItemId: item.id,
          quantity: Number(returnQtyByItem[item.id] || 0),
        }))
        .filter((item) => item.quantity > 0);
      if (items.length === 0) throw new Error("NO_ITEMS");
      const reasonText =
        returnReason === "Other" ? returnCustomReason.trim() : returnReason;
      if (reasonText.length < 5) throw new Error("REASON_SHORT");
      return adminReturnRequestService.adminCreate({
        orderId: selectedId,
        reason: reasonText,
        items,
        adminNotes: returnAdminNotes.trim() || undefined,
        initialStatus: returnInitialStatus,
        force: true,
      });
    },
    onSuccess: () => {
      toast.success("Return arranged");
      void orderQuery.refetch();
      void queryClient.invalidateQueries({
        queryKey: ["admin-escalation-search"],
      });
      refreshAdminOrderLists(queryClient);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "NO_ITEMS") {
        toast.error("Select at least one item quantity to return");
        return;
      }
      if (error instanceof Error && error.message === "REASON_SHORT") {
        toast.error("Enter a return reason (min 5 characters)");
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not arrange return"));
    },
  });

  const updateReturnMutation = useMutation({
    mutationFn: (returnRequestId: string) => {
      const next = rrStatusById[returnRequestId];
      if (!next) throw new Error("No status");
      return adminReturnRequestService.updateStatus(returnRequestId, {
        status: next,
        adminNotes: rrNotesById[returnRequestId]?.trim() || undefined,
        force: true,
      });
    },
    onSuccess: () => {
      toast.success("Return status updated");
      void orderQuery.refetch();
      refreshAdminOrderLists(queryClient);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not update return"));
    },
  });

  const manualShipMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("No order");
      if (!manualCourier.trim() || !manualTracking.trim()) {
        throw new Error("MISSING_FIELDS");
      }
      return adminOrderService.createManualShipping(selectedId, {
        courierName: manualCourier.trim(),
        trackingNumber: manualTracking.trim(),
        ...(manualTrackingUrl.trim()
          ? { trackingUrl: manualTrackingUrl.trim() }
          : {}),
      });
    },
    onSuccess: () => {
      toast.success("Manual shipment saved — order marked Shipped");
      void orderQuery.refetch();
      void queryClient.invalidateQueries({
        queryKey: ["admin-escalation-search"],
      });
      refreshAdminOrderLists(queryClient);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "MISSING_FIELDS") {
        toast.error("Courier name and tracking number are required");
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not save manual shipping"));
    },
  });

  const canCreateShipment = useMemo(
    () => order?.status === "CONFIRMED" || order?.status === "RTO",
    [order?.status],
  );

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = searchInput.trim();
    if (!q) {
      toast.error("Enter order ID, mobile number, or email");
      return;
    }
    setSubmittedQuery(q);
    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h1 className="text-base font-semibold text-amber-950">
              Escalation
            </h1>
            <p className="mt-0.5 text-sm text-amber-800">
              Full admin privileges — override status, arrange returns, force
              coupons, manual shipping, and Shiprocket. Normal eligibility rules
              do not apply. Always add a reason for status changes.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="rounded-xl border border-[#e2e8f0] bg-white p-4 sm:p-5"
      >
        <Label
          htmlFor="escalation-search"
          className="text-xs font-semibold text-[#475569]"
        >
          Order ID / mobile / email
        </Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              id="escalation-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. SS12345678, 9876543210, customer@email.com"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={searchQuery.isFetching}>
            {searchQuery.isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching…
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>
      </form>

      {submittedQuery && !selectedId && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white">
          <div className="border-b border-[#e2e8f0] px-4 py-3 text-sm text-[#64748b]">
            {searchQuery.isFetching
              ? "Searching…"
              : `${results.length} result${results.length === 1 ? "" : "s"} for “${submittedQuery}”`}
          </div>
          {searchQuery.isError ? (
            <p className="px-4 py-8 text-center text-sm text-red-600">
              {getApiErrorMessage(searchQuery.error, "Search failed")}
            </p>
          ) : results.length === 0 && !searchQuery.isFetching ? (
            <p className="px-4 py-8 text-center text-sm text-[#94a3b8]">
              No orders found
            </p>
          ) : (
            <ul className="divide-y divide-[#e2e8f0]">
              {results.map((row) => {
                const statusAt = statusReachedAt(row);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-[#f8fafc] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0f172a]">
                          {formatShortOrderNumber(row.orderNumber)}
                          <span className="ml-2 font-normal text-[#64748b]">
                            {formatCustomerName(row.customerName)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-[#64748b]">
                          {row.customerPhone}
                          {row.customerEmail ? ` · ${row.customerEmail}` : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-[#94a3b8]">
                          Received {formatDate(row.createdAt)}{" "}
                          {formatTime(row.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                        <div className="text-right">
                          <StatusBadge variant={orderStatusVariant(row.status)}>
                            {getOrderStatusLabel(row.status)}
                          </StatusBadge>
                          <p className="mt-1 text-[10px] text-[#94a3b8]">
                            {formatDate(statusAt)} {formatTime(statusAt)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[#0f172a]">
                          {formatPrice(Number(row.grandTotal))}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {selectedId && (
        <div ref={detailRef} className="scroll-mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950">
                {formatShortOrderNumber(
                  order?.orderNumber || selectedSummary?.orderNumber || "Order",
                )}
                <span className="ml-2 font-normal text-amber-800">
                  {formatCustomerName(
                    order?.customerName || selectedSummary?.customerName || "",
                  )}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {order?.customerPhone ||
                  selectedSummary?.customerPhone ||
                  "Opening order…"}
                {selectedSummary || order
                  ? ` · ${getOrderStatusLabel(order?.status || selectedSummary!.status)} since ${formatDateTime(
                      statusReachedAt({
                        status: order?.status || selectedSummary!.status,
                        updatedAt:
                          order?.updatedAt || selectedSummary!.updatedAt,
                        createdAt:
                          order?.createdAt || selectedSummary!.createdAt,
                        refundedAt:
                          order?.refundedAt ?? selectedSummary?.refundedAt,
                        trackingHistory:
                          (order?.trackingHistory as
                            | Array<{ status: string; timestamp: string }>
                            | undefined) || selectedSummary?.trackingHistory,
                      }),
                    )}`
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedId(null)}
            >
              Back to results
            </Button>
          </div>

          {orderQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
              <p className="text-sm text-red-700">
                {getApiErrorMessage(
                  orderQuery.error,
                  "Could not open this order",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void orderQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : orderQuery.isPending || !order ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white py-16 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening order…
            </div>
          ) : (
            <AdminDetailShell
              backHref="/admin/escalation"
              backLabel="Escalation"
              title={formatShortOrderNumber(order.orderNumber)}
              subtitle="Unrestricted escalation tools"
              badge={
                <StatusBadge variant={orderStatusVariant(order.status)}>
                  {getOrderStatusLabel(order.status)}
                </StatusBadge>
              }
            >
              <AdminDetailMain>
                <AdminDetailSection
                  title="Override order"
                  description="Any status is allowed. Moving a failed/pending payment order to Placed (or later) also marks payment as paid so sync cannot revert it."
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/orders/${order.id}?returnTo=${encodeURIComponent("/admin/escalation")}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                    >
                      Full order page
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    {canCreateShipment && (
                      <button
                        type="button"
                        onClick={() => setShipmentOpen(true)}
                        className="inline-flex items-center rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                      >
                        Create shipment
                      </button>
                    )}
                    <Link
                      href={`/admin/refunds?q=${encodeURIComponent(order.orderNumber)}`}
                      className="inline-flex items-center rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                    >
                      Coupon refunds
                    </Link>
                    <Link
                      href={`/admin/return-requests?q=${encodeURIComponent(order.orderNumber)}`}
                      className="inline-flex items-center rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                    >
                      Return requests
                    </Link>
                  </div>

                  <AdminDetailGrid>
                    <AdminFormField
                      label="Customer name"
                      value={customerName}
                      onChange={setCustomerName}
                    />
                    <AdminFormField
                      label="Phone"
                      value={customerPhone}
                      onChange={setCustomerPhone}
                    />
                    <AdminFormField
                      label="Email"
                      value={customerEmail}
                      onChange={setCustomerEmail}
                      type="email"
                    />
                    <AdminFormSelect
                      label="Status (unrestricted)"
                      value={status}
                      onChange={setStatus}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {getOrderStatusLabel(s)}
                        </option>
                      ))}
                    </AdminFormSelect>
                  </AdminDetailGrid>

                  <div className="mt-4 space-y-3">
                    <AdminFormTextarea
                      label="Notes"
                      value={notes}
                      onChange={setNotes}
                      rows={3}
                    />
                    <AdminFormField
                      label="Escalation reason"
                      value={reason}
                      onChange={setReason}
                      placeholder="Required when changing status"
                    />
                    <label className="flex items-center gap-2 text-sm text-[#475569]">
                      <input
                        type="checkbox"
                        checked={clearRefundMarkers}
                        onChange={(e) =>
                          setClearRefundMarkers(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-[#cbd5e1]"
                      />
                      Clear refund markers (refundedAt / coupon link on order)
                    </label>
                  </div>

                  <div className="mt-6">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Shipping address
                    </p>
                    <AdminDetailGrid>
                      <AdminFormField
                        label="Address line 1"
                        value={shippingAddress.addressLine1}
                        onChange={(value) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            addressLine1: value,
                          }))
                        }
                      />
                      <AdminFormField
                        label="Address line 2"
                        value={shippingAddress.addressLine2 || ""}
                        onChange={(value) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            addressLine2: value,
                          }))
                        }
                      />
                      <AdminFormField
                        label="City"
                        value={shippingAddress.city}
                        onChange={(value) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            city: value,
                          }))
                        }
                      />
                      <AdminFormField
                        label="State"
                        value={shippingAddress.state}
                        onChange={(value) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            state: value,
                          }))
                        }
                      />
                      <AdminFormField
                        label="Postal code"
                        value={shippingAddress.postalCode}
                        onChange={(value) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            postalCode: value,
                          }))
                        }
                      />
                      <AdminFormField
                        label="Country"
                        value={shippingAddress.country}
                        onChange={(value) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            country: value,
                          }))
                        }
                      />
                      <AdminFormField
                        label="Landmark"
                        value={shippingAddress.landmark || ""}
                        onChange={(value) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            landmark: value,
                          }))
                        }
                      />
                    </AdminDetailGrid>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="bg-amber-800 hover:bg-amber-900"
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying…
                        </>
                      ) : (
                        "Apply escalation"
                      )}
                    </Button>
                  </div>
                </AdminDetailSection>

                <AdminDetailSection
                  title="Force store-credit coupon"
                  description="Issues a refund coupon even if the order is not cancelled/returned/RTO. Skips normal eligibility rules."
                >
                  <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    {[
                      { label: "No shipping deduction", value: 0 },
                      {
                        label: `Deduct shipping (₹${Number(order.shippingCharge || 0).toFixed(0)})`,
                        value: Math.max(0, Number(order.shippingCharge) || 0),
                      },
                    ].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          const gross =
                            Math.max(0, Number(couponAmount) || 0) +
                            Math.max(0, Number(deduction) || 0);
                          setDeduction(String(option.value));
                          setCouponAmount(
                            String(Math.max(0, gross - option.value)),
                          );
                        }}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                          Number(deduction) === option.value
                            ? "border-amber-800 bg-amber-800 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <AdminDetailGrid>
                    <AdminFormField
                      label="Shipping deduction (₹)"
                      value={deduction}
                      onChange={setDeduction}
                      type="number"
                    />
                    <AdminFormField
                      label="Coupon amount (₹)"
                      value={couponAmount}
                      onChange={setCouponAmount}
                      type="number"
                    />
                  </AdminDetailGrid>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Issue a forced store-credit coupon for this order? This bypasses normal refund eligibility.",
                          )
                        ) {
                          return;
                        }
                        refundMutation.mutate();
                      }}
                      disabled={
                        refundMutation.isPending ||
                        Boolean(order.refundCouponCode)
                      }
                    >
                      {refundMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Issuing…
                        </>
                      ) : order.refundCouponCode ? (
                        `Coupon already issued (${order.refundCouponCode})`
                      ) : (
                        "Issue coupon (force)"
                      )}
                    </Button>
                  </div>
                </AdminDetailSection>

                <AdminDetailSection
                  title="Arrange return"
                  description="Create a return for any order status. Bypasses the 3-day window and delivered-only rule. Any active return is superseded."
                >
                  <AdminDetailGrid>
                    <AdminFormSelect
                      label="Reason"
                      value={returnReason}
                      onChange={setReturnReason}
                    >
                      {RETURN_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </AdminFormSelect>
                    <AdminFormSelect
                      label="Start as"
                      value={returnInitialStatus}
                      onChange={(value) =>
                        setReturnInitialStatus(value as ReturnRequestStatus)
                      }
                    >
                      {ALL_RETURN_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {getReturnRequestStatusLabel(s)}
                        </option>
                      ))}
                    </AdminFormSelect>
                  </AdminDetailGrid>
                  {returnReason === "Other" ? (
                    <div className="mt-3">
                      <AdminFormField
                        label="Custom reason"
                        value={returnCustomReason}
                        onChange={setReturnCustomReason}
                        placeholder="Describe the return reason"
                      />
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <AdminFormTextarea
                      label="Admin notes"
                      value={returnAdminNotes}
                      onChange={setReturnAdminNotes}
                      rows={2}
                    />
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Items to return
                    </p>
                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] px-3 py-2"
                        >
                          <div className="min-w-0 text-sm">
                            <p className="font-medium text-[#0f172a]">
                              {item.productName}
                            </p>
                            <p className="text-xs text-[#64748b]">
                              {item.colorName} · ordered ×{item.quantity}
                              {item.sku ? ` · SKU ${item.sku}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`ret-qty-${item.id}`}
                              className="text-xs text-[#64748b]"
                            >
                              Qty
                            </Label>
                            <Input
                              id={`ret-qty-${item.id}`}
                              type="number"
                              min={0}
                              max={item.quantity}
                              className="w-20"
                              value={String(returnQtyByItem[item.id] ?? 0)}
                              onChange={(e) => {
                                const n = Math.max(
                                  0,
                                  Math.min(
                                    item.quantity,
                                    Number(e.target.value) || 0,
                                  ),
                                );
                                setReturnQtyByItem((prev) => ({
                                  ...prev,
                                  [item.id]: n,
                                }));
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Arrange a return for this order? Normal return eligibility will be bypassed.",
                          )
                        ) {
                          return;
                        }
                        arrangeReturnMutation.mutate();
                      }}
                      disabled={arrangeReturnMutation.isPending}
                      className="bg-amber-800 hover:bg-amber-900"
                    >
                      {arrangeReturnMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Arranging…
                        </>
                      ) : (
                        "Arrange return"
                      )}
                    </Button>
                  </div>
                </AdminDetailSection>

                {(order.returnRequests?.length ?? 0) > 0 ? (
                  <AdminDetailSection
                    title="Manage returns"
                    description="Force any return status jump — no normal workflow limits."
                  >
                    <div className="space-y-4">
                      {(order.returnRequests ?? []).map((rr) => (
                        <div
                          key={rr.id}
                          className="rounded-lg border border-[#e2e8f0] p-3 sm:p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[#0f172a]">
                                {getReturnRequestStatusLabel(rr.status)}
                              </p>
                              <p className="text-xs text-[#64748b]">
                                {rr.reason} · {formatDateTime(rr.createdAt)}
                              </p>
                            </div>
                            <Link
                              href={`/admin/return-requests/${rr.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#475569] hover:underline"
                            >
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                          <AdminDetailGrid>
                            <AdminFormSelect
                              label="Status (force)"
                              value={rrStatusById[rr.id] || rr.status}
                              onChange={(value) =>
                                setRrStatusById((prev) => ({
                                  ...prev,
                                  [rr.id]: value as ReturnRequestStatus,
                                }))
                              }
                            >
                              {ALL_RETURN_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {getReturnRequestStatusLabel(s)}
                                </option>
                              ))}
                            </AdminFormSelect>
                            <AdminFormField
                              label="Admin notes"
                              value={rrNotesById[rr.id] ?? ""}
                              onChange={(value) =>
                                setRrNotesById((prev) => ({
                                  ...prev,
                                  [rr.id]: value,
                                }))
                              }
                            />
                          </AdminDetailGrid>
                          <div className="mt-3 flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={updateReturnMutation.isPending}
                              onClick={() => updateReturnMutation.mutate(rr.id)}
                            >
                              {updateReturnMutation.isPending &&
                              updateReturnMutation.variables === rr.id ? (
                                <>
                                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                  Saving…
                                </>
                              ) : (
                                "Force update status"
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminDetailSection>
                ) : null}

                <AdminDetailSection
                  title="Manual shipping"
                  description="Set courier + tracking and mark the order as Shipped without Shiprocket."
                >
                  <AdminDetailGrid>
                    <AdminFormField
                      label="Courier name"
                      value={manualCourier}
                      onChange={setManualCourier}
                      placeholder="e.g. DTDC, India Post"
                    />
                    <AdminFormField
                      label="Tracking number"
                      value={manualTracking}
                      onChange={setManualTracking}
                    />
                    <AdminFormField
                      label="Tracking URL (optional)"
                      value={manualTrackingUrl}
                      onChange={setManualTrackingUrl}
                    />
                  </AdminDetailGrid>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Save manual shipping and mark this order as Shipped?",
                          )
                        ) {
                          return;
                        }
                        manualShipMutation.mutate();
                      }}
                      disabled={manualShipMutation.isPending}
                    >
                      {manualShipMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save manual shipment"
                      )}
                    </Button>
                  </div>
                </AdminDetailSection>
              </AdminDetailMain>

              <AdminDetailAside>
                <div className="space-y-3 rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <AdminDetailInfo
                    label="Order"
                    value={formatShortOrderNumber(order.orderNumber)}
                  />
                  <AdminDetailInfo
                    label="Status"
                    value={
                      <StatusBadge variant={orderStatusVariant(order.status)}>
                        {getOrderStatusLabel(order.status)}
                      </StatusBadge>
                    }
                  />
                  <AdminDetailInfo
                    label="Total"
                    value={formatPrice(Number(order.grandTotal))}
                  />
                  <AdminDetailInfo
                    label="Payment"
                    value={
                      order.payments?.[0]
                        ? `${order.payments[0].status} · ${formatPaymentMethodLabel(
                            {
                              method: order.payments[0].method,
                            },
                          )}`
                        : "—"
                    }
                  />
                  <AdminDetailInfo
                    label="Refund coupon"
                    value={order.refundCouponCode || "—"}
                  />
                  <AdminDetailInfo
                    label="Created"
                    value={formatDateTime(order.createdAt)}
                  />
                </div>
                <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Items
                  </p>
                  <ul className="mt-2 space-y-2">
                    {order.items.map((item) => (
                      <li key={item.id} className="text-sm text-[#0f172a]">
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-[#64748b]">
                          {" "}
                          · {item.colorName} × {item.quantity}
                        </span>
                        {item.sku ? (
                          <span className="mt-0.5 block text-xs text-[#94a3b8]">
                            SKU {item.sku}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </AdminDetailAside>
            </AdminDetailShell>
          )}
        </div>
      )}

      <CreateShipmentDialog
        open={shipmentOpen}
        onOpenChange={setShipmentOpen}
        orderIds={selectedId && canCreateShipment ? [selectedId] : []}
        onSuccess={() => {
          void orderQuery.refetch();
          refreshAdminOrderLists(queryClient);
        }}
      />
    </div>
  );
}
