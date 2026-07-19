'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { adminCouponService } from '@/services/admin.service';
import { formatPrice } from '@/lib/utils';
import { toIsoOrUndefined } from '@/lib/datetime-local';
import {
  AdminDetailGrid,
  AdminDetailInfo,
  AdminDetailInfoGrid,
  AdminDetailMain,
  AdminDetailSaveBar,
  AdminDetailSection,
  AdminDetailShell,
  AdminFormCheckbox,
  AdminFormField,
  AdminFormSelect,
} from '@/components/admin/admin-detail';

export default function AdminCreateCouponPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [type, setType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const create = useMutation({
    mutationFn: () => {
      if (!code.trim() || code.trim().length < 3) {
        throw new Error('Coupon code must be at least 3 characters');
      }
      if (!value || Number(value) <= 0) {
        throw new Error('Enter a valid discount value');
      }
      if (type === 'PERCENTAGE' && Number(value) > 100) {
        throw new Error('Percentage cannot exceed 100');
      }

      return adminCouponService.create({
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        minOrderAmount: Number(minOrderAmount) || 0,
        ...(maxDiscount ? { maxDiscount: Number(maxDiscount) } : {}),
        ...(usageLimit ? { usageLimit: Number(usageLimit) } : {}),
        ...(toIsoOrUndefined(startsAt) ? { startsAt: toIsoOrUndefined(startsAt) } : {}),
        ...(toIsoOrUndefined(expiresAt) ? { expiresAt: toIsoOrUndefined(expiresAt) } : {}),
        isActive,
      });
    },
    onSuccess: (coupon) => {
      toast.success('Coupon created');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      router.push(`/admin/coupons/${coupon.id}`);
    },
    onError: (error: unknown) => {
      if (error instanceof Error && !isAxiosError(error)) {
        toast.error(error.message);
        return;
      }
      const message = isAxiosError(error)
        ? error.response?.data?.message || 'Failed to create coupon'
        : 'Failed to create coupon';
      toast.error(message);
    },
  });

  return (
    <AdminDetailShell
      backHref="/admin/coupons"
      backLabel="Back to Coupons"
      title="Create Coupon"
      subtitle="Add a new discount code for checkout"
      footer={
        <AdminDetailSaveBar
          onSave={() => create.mutate()}
          saving={create.isPending}
          saveLabel="Create Coupon"
          savingLabel="Creating..."
          extra={
            <button
              type="button"
              onClick={() => router.push('/admin/coupons')}
              className="rounded-lg border border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
          }
        />
      }
    >
      <AdminDetailGrid>
        <AdminDetailMain>
          <AdminDetailSection title="Coupon Settings">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField label="Coupon Code" value={code} onChange={setCode} placeholder="e.g. FESTIVE10" />
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
                  placeholder="Optional"
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
          <AdminDetailSection title="Preview">
            <AdminDetailInfoGrid>
              <AdminDetailInfo
                label="Discount"
                value={
                  value
                    ? type === 'FLAT'
                      ? formatPrice(Number(value))
                      : `${value}%`
                    : '—'
                }
              />
              <AdminDetailInfo label="Min Order" value={formatPrice(Number(minOrderAmount) || 0)} />
              <AdminDetailInfo label="Usage Limit" value={usageLimit || 'Unlimited'} />
              <AdminDetailInfo
                label="Schedule"
                value={
                  startsAt || expiresAt
                    ? `${startsAt || 'Now'} → ${expiresAt || 'No end'}`
                    : 'No schedule'
                }
              />
            </AdminDetailInfoGrid>
          </AdminDetailSection>
        </aside>
      </AdminDetailGrid>
    </AdminDetailShell>
  );
}
