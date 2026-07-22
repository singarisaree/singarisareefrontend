"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { adminRefundService } from "@/services/admin.service";
import {
  formatDate,
  formatPrice,
  formatCustomerName,
  formatShortOrderNumber,
} from "@/lib/utils";
import { useAdminPagination } from "@/lib/use-admin-pagination";
import { useResetPageOnFilterChange } from "@/lib/use-reset-page-on-filter-change";
import {
  useAdminSearchParam,
  useAdminEnumParam,
  useAdminDateRangeParam,
} from "@/lib/use-admin-list-filters";
import { StatusBadge } from "@/components/admin/status-badge";
import { ViewDetailsButton } from "@/components/admin/view-details-button";
import { AdminTableSkeleton } from "@/components/admin/loading-skeletons";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DataTableToolbar,
  FilterTabs,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  AdminTh,
  AdminTd,
} from "@/components/admin/data-table";
import type { RefundEligibleOrder } from "@/types";

const FILTER_VALUES = ["all", "pending", "completed"] as const;

function refundTypeLabel(type: RefundEligibleOrder["refundType"]) {
  if (type === "CANCELLATION") return "Cancellation";
  if (type === "RETURN") return "Returned";
  return type;
}

export default function AdminRefundsPage() {
  const queryClient = useQueryClient();
  const { search, debouncedSearch, onSearchChange } = useAdminSearchParam();
  const [filter, setFilter] = useAdminEnumParam("filter", FILTER_VALUES, "all");
  const { dateRange, onDateRangeChange, dateParams } = useAdminDateRangeParam();
  const [selectedOrder, setSelectedOrder] =
    useState<RefundEligibleOrder | null>(null);
  const [deduction, setDeduction] = useState("0");
  const [couponAmount, setCouponAmount] = useState("");
  const [issuedCouponCode, setIssuedCouponCode] = useState<string | null>(null);
  const { page, setPage, pageSize, setPageSize, resetPage } =
    useAdminPagination();

  useResetPageOnFilterChange(
    resetPage,
    debouncedSearch,
    filter,
    dateParams.startDate,
    dateParams.endDate,
  );

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: [
      "admin-refunds",
      debouncedSearch,
      page,
      pageSize,
      filter,
      dateParams,
    ],
    queryFn: () =>
      adminRefundService.getAll({
        page,
        limit: pageSize,
        filter,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...dateParams,
      }),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const showSkeleton = isLoading && orders.length === 0;

  const maxCouponAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    const eligible = selectedOrder.eligibleAmount ?? selectedOrder.grandTotal;
    const deduct = Math.max(0, Number(deduction) || 0);
    return Math.max(0, eligible - deduct);
  }, [selectedOrder, deduction]);

  const processMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrder) throw new Error("No order selected");
      return adminRefundService.process(selectedOrder.id, {
        deduction: Math.max(0, Number(deduction) || 0),
        couponAmount: Number(couponAmount),
      });
    },
    onSuccess: (result) => {
      const code = result.couponCode ?? result.refundCouponCode ?? null;
      setIssuedCouponCode(code);
      toast.success(
        code ? `Coupon issued: ${code}` : "Store credit coupon issued",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err: Error) =>
      toast.error(err.message || "Could not issue coupon"),
  });

  const openRefundModal = (order: RefundEligibleOrder) => {
    setSelectedOrder(order);
    const eligible = order.eligibleAmount ?? order.grandTotal;
    // Default to full eligible credit; admin can opt to deduct shipping.
    setDeduction("0");
    setCouponAmount(String(Math.max(0, eligible)));
    setIssuedCouponCode(null);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setDeduction("0");
    setCouponAmount("");
    setIssuedCouponCode(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Coupon refunds</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Issue phone-linked store credit coupons for cancelled, returned, or
          RTO orders (no cash refunds)
        </p>
      </div>

      <FilterTabs
        value={filter}
        onChange={(value) => setFilter(value as (typeof FILTER_VALUES)[number])}
        options={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "completed", label: "Refunded" },
        ]}
      />

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load refunds.{" "}
          {(error as Error)?.message ||
            "Please refresh or restart the backend server."}
        </div>
      )}

      <AdminTableCard>
        <div className="border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search order, customer, phone..."
            searchValue={search}
            onSearchChange={onSearchChange}
            searchMaxWidth="max-w-md"
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTh>Order</AdminTh>
            <AdminTh>Customer</AdminTh>
            <AdminTh>Type</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh>Refundable</AdminTh>
            <AdminTh>Payment</AdminTh>
            <AdminTh>Coupon</AdminTh>
            <AdminTh>Date</AdminTh>
            <AdminTh>Actions</AdminTh>
          </AdminTableHead>
          <tbody
            className={`divide-y divide-[#e2e8f0] transition-opacity ${isFetching ? "opacity-60" : ""}`}
          >
            {showSkeleton ? (
              <AdminTableSkeleton rows={8} cols={9} />
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-12 text-center text-sm text-[#64748b]"
                >
                  {filter === "pending"
                    ? "No orders pending coupon refund"
                    : filter === "completed"
                      ? "No coupon refunds issued yet"
                      : "No refund records found"}
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const refundable =
                  order.refundAmount != null
                    ? Number(order.refundAmount)
                    : Number(order.eligibleAmount ?? order.grandTotal);
                const showOrderTotal =
                  order.refundType === "RETURN" &&
                  Math.abs(refundable - Number(order.grandTotal)) > 0.009;

                return (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-[#f8fafc]"
                  >
                    <AdminTd className="font-semibold text-[#0f172a]">
                      {formatShortOrderNumber(order.orderNumber)}
                    </AdminTd>
                    <AdminTd>
                      <div>
                        <p className="font-medium text-[#0f172a]">
                          {formatCustomerName(order.customerName)}
                        </p>
                        <p className="text-xs text-[#64748b]">
                          {order.customerPhone}
                        </p>
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <StatusBadge
                        variant={
                          order.refundType === "CANCELLATION"
                            ? "danger"
                            : "neutral"
                        }
                      >
                        {refundTypeLabel(order.refundType)}
                      </StatusBadge>
                    </AdminTd>
                    <AdminTd>
                      <StatusBadge
                        variant={order.isRefunded ? "active" : "pending"}
                      >
                        {order.isRefunded ? "Refunded" : "Pending"}
                      </StatusBadge>
                    </AdminTd>
                    <AdminTd>
                      <p className="font-semibold text-[#0f172a]">
                        {formatPrice(refundable)}
                      </p>
                      {showOrderTotal ? (
                        <p className="text-[11px] text-[#94a3b8]">
                          Order total {formatPrice(order.grandTotal)}
                        </p>
                      ) : null}
                    </AdminTd>
                    <AdminTd>
                      <StatusBadge
                        variant={
                          order.isRefunded || order.paymentStatus === "SUCCESS"
                            ? "active"
                            : "pending"
                        }
                      >
                        {order.isRefunded
                          ? "Refunded"
                          : order.paymentStatus || "N/A"}
                      </StatusBadge>
                    </AdminTd>
                    <AdminTd className="text-xs text-[#64748b]">
                      {order.isRefunded ? (
                        <div>
                          {order.refundCouponCode && (
                            <p className="font-medium text-[#0f172a]">
                              {order.refundCouponCode}
                            </p>
                          )}
                          {order.refundAmount != null && (
                            <p>{formatPrice(order.refundAmount)}</p>
                          )}
                          {order.refundDeduction != null &&
                            order.refundDeduction > 0 && (
                              <p>
                                Deduction: {formatPrice(order.refundDeduction)}
                              </p>
                            )}
                        </div>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </AdminTd>
                    <AdminTd className="text-sm text-[#64748b]">
                      {order.refundedAt
                        ? formatDate(order.refundedAt)
                        : order.returnedAt
                          ? formatDate(order.returnedAt)
                          : order.cancelledAt
                            ? formatDate(order.cancelledAt)
                            : formatDate(order.createdAt)}
                    </AdminTd>
                    <AdminTd>
                      <div className="flex items-center gap-2">
                        <ViewDetailsButton
                          href={`/admin/orders/${order.id}`}
                          prefetchOrderId={order.id}
                          label="Order Details"
                        />
                        {!order.isRefunded && (
                          <Button
                            type="button"
                            size="sm"
                            variant="gold"
                            onClick={() => openRefundModal(order)}
                          >
                            Issue Coupon
                          </Button>
                        )}
                      </div>
                    </AdminTd>
                  </tr>
                );
              })
            )}
          </tbody>
        </AdminTable>

        {meta && (
          <AdminPagination
            meta={meta}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </AdminTableCard>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xl">
            {issuedCouponCode ? (
              <>
                <h2 className="text-lg font-semibold text-[#0f172a]">
                  Coupon issued
                </h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  Order {formatShortOrderNumber(selectedOrder.orderNumber)} ·
                  linked to {selectedOrder.customerPhone}
                </p>
                <div className="mt-4 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-[#64748b]">
                    Store credit code
                  </p>
                  <p className="mt-2 font-mono text-xl font-semibold text-[#0f172a]">
                    {issuedCouponCode}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button type="button" variant="gold" onClick={closeModal}>
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-[#0f172a]">
                  Issue store credit coupon
                </h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  Order {formatShortOrderNumber(selectedOrder.orderNumber)} ·{" "}
                  {selectedOrder.refundType === "RETURN"
                    ? "Returned items"
                    : "Eligible"}{" "}
                  {formatPrice(
                    selectedOrder.eligibleAmount ?? selectedOrder.grandTotal,
                  )}
                </p>
                {selectedOrder.refundType === "RETURN" &&
                Math.abs(
                  Number(selectedOrder.eligibleAmount ?? 0) -
                    Number(selectedOrder.grandTotal),
                ) > 0.009 ? (
                  <p className="mt-1 text-xs text-[#94a3b8]">
                    Order total {formatPrice(selectedOrder.grandTotal)} (coupon
                    is capped to returned items)
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-[#64748b]">
                  Coupon will be locked to {selectedOrder.customerPhone}.
                  Reusable on future orders with the same number until the
                  credit balance is used up.
                </p>

                <div className="mt-4 space-y-4">
                  {(() => {
                    const eligible =
                      selectedOrder.eligibleAmount ?? selectedOrder.grandTotal;
                    const shippingCharge = Math.max(
                      0,
                      Number(selectedOrder.shippingCharge) || 0,
                    );
                    const shippingDeductOption = Math.min(
                      eligible,
                      shippingCharge,
                    );
                    const deductValue = Math.max(0, Number(deduction) || 0);
                    const applyShipping = deductValue > 0 && shippingCharge > 0;

                    const setRefundAmounts = (nextDeduction: number) => {
                      const capped = Math.min(
                        eligible,
                        Math.max(0, nextDeduction),
                      );
                      setDeduction(String(capped));
                      setCouponAmount(String(Math.max(0, eligible - capped)));
                    };

                    return (
                      <>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                            Credit breakdown
                          </p>
                          <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-[#64748b]">Eligible amount</dt>
                              <dd className="font-medium text-[#0f172a]">
                                {formatPrice(eligible)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-[#64748b]">
                                Shipping deducted
                              </dt>
                              <dd className="font-medium text-[#0f172a]">
                                {applyShipping
                                  ? `− ${formatPrice(deductValue)}`
                                  : formatPrice(0)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-[#e2e8f0] pt-2">
                              <dt className="font-semibold text-[#0f172a]">
                                Store credit coupon
                              </dt>
                              <dd className="text-base font-bold text-[#0f172a]">
                                {formatPrice(Number(couponAmount) || 0)}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {shippingCharge > 0 ? (
                          <div>
                            <Label>Shipping charge</Label>
                            <p className="mt-1 text-xs text-[#64748b]">
                              Order shipping was {formatPrice(shippingCharge)}.
                              Choose whether to keep it in the coupon or deduct
                              it.
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {[
                                {
                                  label: "Keep full amount",
                                  hint: "No shipping deducted",
                                  value: 0,
                                },
                                {
                                  label: "Deduct shipping",
                                  hint: `Minus ${formatPrice(shippingDeductOption)}`,
                                  value: shippingDeductOption,
                                },
                              ].map((option) => (
                                <button
                                  key={option.label}
                                  type="button"
                                  onClick={() => setRefundAmounts(option.value)}
                                  className={`rounded-lg border px-3 py-2.5 text-left ${
                                    Number(deduction) === option.value
                                      ? "border-[#0f172a] bg-[#0f172a] text-white"
                                      : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]"
                                  }`}
                                >
                                  <span className="block text-sm font-semibold">
                                    {option.label}
                                  </span>
                                  <span
                                    className={`mt-0.5 block text-xs ${
                                      Number(deduction) === option.value
                                        ? "text-white/70"
                                        : "text-[#94a3b8]"
                                    }`}
                                  >
                                    {option.hint}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs text-[#64748b]">
                            No shipping charge on this order — full eligible
                            amount can be issued as store credit.
                          </p>
                        )}

                        <div>
                          <Label htmlFor="couponAmount">
                            Adjust coupon amount (optional)
                          </Label>
                          <Input
                            id="couponAmount"
                            type="number"
                            min={1}
                            max={maxCouponAmount}
                            step="1"
                            value={couponAmount}
                            onChange={(e) => setCouponAmount(e.target.value)}
                            className="mt-1.5"
                          />
                          <p className="mt-1 text-xs text-[#64748b]">
                            You can issue up to {formatPrice(maxCouponAmount)}.
                            Leave as calculated unless you need a smaller
                            credit.
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="gold"
                    disabled={
                      processMutation.isPending ||
                      !couponAmount ||
                      Number(couponAmount) <= 0
                    }
                    onClick={() => processMutation.mutate()}
                  >
                    {processMutation.isPending ? "Issuing..." : "Issue Coupon"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
