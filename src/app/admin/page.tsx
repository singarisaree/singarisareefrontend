'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  IndianRupee,
  ShoppingCart,
  Clock,
  Truck,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Package,
  ArrowRight,
  Warehouse,
  CreditCard,
} from 'lucide-react';
import { adminDashboardService } from '@/services/admin.service';
import { formatPrice, getOrderStatusLabel } from '@/lib/utils';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { SectionSkeleton, StatCardSkeleton } from '@/components/admin/loading-skeletons';
import type { DashboardStats } from '@/types';

function formatMonthLabel(month: string) {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function AttentionLink({
  href,
  label,
  count,
  tone = 'neutral',
}: {
  href: string;
  label: string;
  count: number;
  tone?: 'neutral' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
        : 'border-[#e2e8f0] bg-[#f8fafc] text-[#334155] hover:bg-[#f1f5f9]';

  return (
    <Link
      href={href}
      className={
        'flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ' +
        toneClass
      }
    >
      <span className="font-medium">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-semibold">
        {count}
        <ArrowRight className="h-3.5 w-3.5 opacity-70" />
      </span>
    </Link>
  );
}

function PipelineRow({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max > 0 ? Math.max((count / max) * 100, count > 0 ? 4 : 0) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#64748b]">{label}</span>
        <span className="font-semibold text-[#0f172a]">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
        <div
          className="h-full rounded-full bg-[#0f172a]"
          style={{ width: width + '%' }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: rawStats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => adminDashboardService.getStats(),
    staleTime: 60 * 1000,
  });

  const stats: DashboardStats | undefined = rawStats
    ? {
        totalRevenue: Number(rawStats.totalRevenue ?? 0),
        todayRevenue: Number(rawStats.todayRevenue ?? 0),
        weekRevenue: Number(rawStats.weekRevenue ?? 0),
        monthRevenue: Number(rawStats.monthRevenue ?? 0),
        todayOrders: rawStats.todayOrders ?? 0,
        pendingOrders: rawStats.pendingOrders ?? 0,
        paymentPending: rawStats.paymentPending ?? 0,
        confirmed: rawStats.confirmed ?? 0,
        readyToShip: rawStats.readyToShip ?? 0,
        shipped: rawStats.shipped ?? 0,
        inTransit: rawStats.inTransit ?? 0,
        deliveredOrders: rawStats.deliveredOrders ?? 0,
        cancelledOrders: rawStats.cancelledOrders ?? 0,
        failed: rawStats.failed ?? 0,
        rto: rawStats.rto ?? 0,
        returned: rawStats.returned ?? 0,
        refunded: rawStats.refunded ?? 0,
        placed: rawStats.placed ?? 0,
        activeProducts: rawStats.activeProducts ?? 0,
        outOfStockCount: rawStats.outOfStockCount ?? 0,
        openReturnRequests: rawStats.openReturnRequests ?? 0,
        orderPipeline: rawStats.orderPipeline ?? [],
        topProducts: rawStats.topProducts ?? [],
        lowStock: rawStats.lowStock ?? [],
        salesByMonth: rawStats.salesByMonth ?? [],
      }
    : undefined;

  const pipelineRows =
    stats?.orderPipeline?.length
      ? stats.orderPipeline
      : [
          { status: 'PLACED', count: stats?.placed ?? 0 },
          { status: 'PAYMENT_PENDING', count: stats?.paymentPending ?? 0 },
          { status: 'CONFIRMED', count: stats?.confirmed ?? 0 },
          { status: 'READY_TO_SHIP', count: stats?.readyToShip ?? 0 },
          { status: 'SHIPPED', count: stats?.shipped ?? 0 },
          { status: 'IN_TRANSIT', count: stats?.inTransit ?? 0 },
          { status: 'DELIVERED', count: stats?.deliveredOrders ?? 0 },
          { status: 'RETURNED', count: stats?.returned ?? 0 },
          { status: 'CANCELLED', count: stats?.cancelledOrders ?? 0 },
          { status: 'FAILED', count: stats?.failed ?? 0 },
          { status: 'RTO', count: stats?.rto ?? 0 },
          { status: 'REFUNDED', count: stats?.refunded ?? 0 },
        ];

  const pipelineMax = Math.max(...pipelineRows.map((row) => row.count), 1);

  const salesMax = stats?.salesByMonth.length
    ? Math.max(...stats.salesByMonth.map((item) => item.revenue), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Sales, orders needing action, and catalog health at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {isLoading || !stats ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Revenue"
              value={formatPrice(Number(stats.totalRevenue))}
              subtext="All time"
              icon={IndianRupee}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              label="Today Revenue"
              value={formatPrice(Number(stats.todayRevenue))}
              subtext={stats.todayOrders + ' orders today'}
              icon={TrendingUp}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              label="Today Orders"
              value={stats.todayOrders}
              icon={ShoppingCart}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
            />
            <StatCard
              label="Pending Action"
              value={stats.pendingOrders}
              subtext="Placed / payment / confirmed"
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              label="Ready to Ship"
              value={stats.readyToShip}
              icon={Truck}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
            <StatCard
              label="Open Returns"
              value={stats.openReturnRequests}
              icon={RotateCcw}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
            />
          </>
        )}
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#0f172a]">Needs attention</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading || !stats ? (
            <SectionSkeleton lines={2} />
          ) : (
            <>
              <AttentionLink
                href="/admin/orders"
                label="Payment pending"
                count={stats.paymentPending}
                tone={stats.paymentPending > 0 ? 'warn' : 'neutral'}
              />
              <AttentionLink
                href="/admin/dispatches"
                label="Ready to ship"
                count={stats.readyToShip}
                tone={stats.readyToShip > 0 ? 'warn' : 'neutral'}
              />
              <AttentionLink
                href="/admin/return-requests"
                label="Open returns"
                count={stats.openReturnRequests}
                tone={stats.openReturnRequests > 0 ? 'danger' : 'neutral'}
              />
              <AttentionLink
                href="/admin/stock"
                label="Low stock items"
                count={stats.lowStock.length}
                tone={stats.lowStock.length > 0 ? 'danger' : 'neutral'}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#64748b]" />
              <h2 className="font-semibold text-[#0f172a]">Sales Overview</h2>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {isLoading || !stats ? (
              <SectionSkeleton lines={2} />
            ) : (
              <>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5">
                  <p className="text-xs text-[#64748b]">This week</p>
                  <p className="mt-1 text-sm font-semibold text-[#0f172a]">
                    {formatPrice(Number(stats.weekRevenue))}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5">
                  <p className="text-xs text-[#64748b]">This month</p>
                  <p className="mt-1 text-sm font-semibold text-[#0f172a]">
                    {formatPrice(Number(stats.monthRevenue))}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="mt-5 space-y-3">
            {isLoading || !stats ? (
              <SectionSkeleton lines={4} />
            ) : stats.salesByMonth.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">No sales data yet</p>
            ) : (
              stats.salesByMonth.map((item) => {
                const width = Math.max((item.revenue / salesMax) * 100, item.revenue > 0 ? 4 : 0);
                return (
                  <div key={item.month} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#64748b]">{formatMonthLabel(item.month)}</span>
                      <span className="font-semibold text-[#0f172a]">{formatPrice(item.revenue)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                      <div
                        className="h-full rounded-full bg-emerald-500/80"
                        style={{ width: width + '%' }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#64748b]" />
            <h2 className="font-semibold text-[#0f172a]">Order Pipeline</h2>
          </div>
          <div className="mt-5 space-y-3">
            {isLoading || !stats ? (
              <SectionSkeleton lines={6} />
            ) : (
              pipelineRows.map((row) => (
                <PipelineRow
                  key={row.status}
                  label={getOrderStatusLabel(row.status)}
                  count={row.count}
                  max={pipelineMax}
                />
              ))
            )}
          </div>
          {!isLoading && stats ? (
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#e2e8f0] pt-4">
              <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                <p className="text-xs text-[#64748b]">Active products</p>
                <p className="mt-0.5 text-sm font-semibold text-[#0f172a]">{stats.activeProducts}</p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                <p className="text-xs text-[#64748b]">Out of stock</p>
                <p className="mt-0.5 text-sm font-semibold text-[#0f172a]">{stats.outOfStockCount}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-[#0f172a]">Low Stock Alert</h2>
            </div>
            <Link href="/admin/stock" className="text-xs font-medium text-[#64748b] hover:text-[#0f172a]">
              View stock
            </Link>
          </div>
          <div className="mt-5">
            {isLoading || !stats ? (
              <SectionSkeleton lines={4} />
            ) : stats.lowStock.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">All stock levels healthy</p>
            ) : (
              <div className="space-y-3">
                {stats.lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#0f172a]">{item.product.name}</p>
                      <p className="text-xs text-[#94a3b8]">
                        {item.productColor.name} - {item.product.sku}
                      </p>
                    </div>
                    <StatusBadge variant="danger">{item.quantity} left</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-[#64748b]" />
              <h2 className="font-semibold text-[#0f172a]">Top Products</h2>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-medium text-[#64748b] hover:text-[#0f172a]"
            >
              View products
            </Link>
          </div>
          <div className="mt-5">
            {isLoading || !stats ? (
              <SectionSkeleton lines={5} />
            ) : stats.topProducts.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">No products yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-xs font-semibold text-[#64748b]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#0f172a]">{product.name}</p>
                        <p className="text-xs text-[#94a3b8]">{product.sku}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-[#0f172a]">{product.soldCount}</p>
                      <p className="text-[10px] text-[#94a3b8]">actual sold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isLoading && stats ? <CatalogSummary stats={stats} /> : null}
    </div>
  );
}

function CatalogSummary({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
          <Package className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-xs text-[#64748b]">Live catalog</p>
          <p className="text-sm font-semibold text-[#0f172a]">{stats.activeProducts} products</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
          <CreditCard className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-xs text-[#64748b]">Confirmed awaiting pack</p>
          <p className="text-sm font-semibold text-[#0f172a]">{stats.confirmed}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
        </div>
        <div>
          <p className="text-xs text-[#64748b]">Out of stock</p>
          <p className="text-sm font-semibold text-[#0f172a]">{stats.outOfStockCount}</p>
        </div>
      </div>
    </div>
  );
}
