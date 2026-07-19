'use client';

import { use, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { adminCouponService } from '@/services/admin.service';
import { UnsavedGuard } from '@/components/admin/unsaved-guard';
import { formatPrice } from '@/lib/utils';
import { toDatetimeLocalValue, toIsoOrUndefined } from '@/lib/datetime-local';
import { StatusBadge } from '@/components/admin/status-badge';
import {
  AdminDetailEmpty,
  AdminDetailGrid,
  AdminDetailInfo,
  AdminDetailInfoGrid,
  AdminDetailLoading,
  AdminDetailMain,
  AdminDetailSaveBar,
  AdminDetailSection,
  AdminDetailShell,
  AdminFormCheckbox,
  AdminFormField,
  AdminFormSelect,
} from '@/components/admin/admin-detail';

export default function AdminCouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [type, setType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const { data: coupon, isLoading } = useQuery({
    queryKey: ['admin-coupon', id],
    queryFn: () => adminCouponService.getById(id),
  });

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code);
      setType(coupon.type);
      setValue(String(coupon.value));
      setMinOrderAmount(String(coupon.minOrderAmount));
      setMaxDiscount(coupon.maxDiscount ? String(coupon.maxDiscount) : '');
      setUsageLimit(coupon.usageLimit ? String(coupon.usageLimit) : '');
      setStartsAt(toDatetimeLocalValue(coupon.startsAt));
      setExpiresAt(toDatetimeLocalValue(coupon.expiresAt));
      setIsActive(coupon.isActive);
      setIsDirty(false);
    }
  }, [coupon]);

  const save = useMutation({
    mutationFn: () =>
      adminCouponService.update(id, {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        startsAt: toIsoOrUndefined(startsAt) ?? null,
        expiresAt: toIsoOrUndefined(expiresAt) ?? null,
        isActive,
      }),
    onSuccess: () => {
      toast.success('Coupon updated');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['admin-coupon', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.message || 'Failed to update coupon'
        : 'Failed to update coupon';
      toast.error(message);
    },
  });

  const remove = useMutation({
    mutationFn: () => adminCouponService.delete(id),
    onSuccess: () => {
      toast.success('Coupon deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      router.push('/admin/coupons');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.message || 'Failed to delete coupon'
        : 'Failed to delete coupon';
      toast.error(message);
    },
  });

  if (isLoading) return <AdminDetailLoading />;
  if (!coupon) return <AdminDetailEmpty message="Coupon not found" />;

  return (
    <div onChange={() => setIsDirty(true)}>
      <UnsavedGuard hasChanges={isDirty} />
      <AdminDetailShell
        backHref="/admin/coupons"
        backLabel="Back to Coupons"
        title={coupon.code}
        subtitle={`Used ${coupon.usedCount}${coupon.usageLimit ? ` of ${coupon.usageLimit}` : ''} times`}
        badge={
          <StatusBadge variant={coupon.isActive ? 'active' : 'inactive'}>
            {coupon.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>
        }
        footer={
          <AdminDetailSaveBar
            onSave={() => save.mutate()}
            saving={save.isPending}
            extra={
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) return;
                  remove.mutate();
                }}
                disabled={remove.isPending || save.isPending}
                className="rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {remove.isPending ? 'Deleting...' : 'Delete'}
              </button>
            }
          />
        }
      >
        <AdminDetailGrid>
          <AdminDetailMain>
            <AdminDetailSection title="Coupon Settings">
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField label="Coupon Code" value={code} onChange={setCode} />
                <AdminFormSelect
                  label="Discount Type"
                  value={type}
                  onChange={(v) => setType(v as 'FLAT' | 'PERCENTAGE')}
                >
                  <option value="FLAT">Flat Amount (Rs.)</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                </AdminFormSelect>
                <AdminFormField
                  label={type === 'FLAT' ? 'Discount Amount (Rs.)' : 'Discount (%)'}
                  value={value}
                  onChange={setValue}
                  type="number"
                />
                <AdminFormField
                  label="Minimum Order (Rs.)"
                  value={minOrderAmount}
                  onChange={setMinOrderAmount}
                  type="number"
                />
                {type === 'PERCENTAGE' && (
                  <AdminFormField
                    label="Max Discount (Rs.)"
                    value={maxDiscount}
                    onChange={setMaxDiscount}
                    type="number"
                  />
                )}
                <AdminFormField
                  label="Usage Limit"
                  value={usageLimit}
                  onChange={setUsageLimit}
                  type="number"
                  placeholder="Unlimited if empty"
                />
                <AdminFormField
                  label="Starts At"
                  value={startsAt}
                  onChange={setStartsAt}
                  type="datetime-local"
                />
                <AdminFormField
                  label="Expires At"
                  value={expiresAt}
                  onChange={setExpiresAt}
                  type="datetime-local"
                />
              </div>
              <div className="mt-4">
                <AdminFormCheckbox label="Active coupon" checked={isActive} onChange={setIsActive} />
              </div>
            </AdminDetailSection>
          </AdminDetailMain>

          <aside className="space-y-6">
            <AdminDetailSection title="Summary">
              <AdminDetailInfoGrid>
                <AdminDetailInfo
                  label="Discount"
                  value={type === 'FLAT' ? formatPrice(Number(value || coupon.value)) : `${value || coupon.value}%`}
                />
                <AdminDetailInfo
                  label="Min Order"
                  value={formatPrice(Number(minOrderAmount || coupon.minOrderAmount))}
                />
                <AdminDetailInfo label="Times Used" value={String(coupon.usedCount)} />
                <AdminDetailInfo
                  label="Usage Limit"
                  value={usageLimit || coupon.usageLimit ? String(usageLimit || coupon.usageLimit) : 'Unlimited'}
                />
              </AdminDetailInfoGrid>
            </AdminDetailSection>
          </aside>
        </AdminDetailGrid>
      </AdminDetailShell>
    </div>
  );
}
