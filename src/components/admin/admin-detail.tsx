import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const inputClass =
  'h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a] focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]';
const textareaClass =
  'w-full resize-y rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0f172a] break-words focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]';

export function AdminDetailShell({
  backHref,
  backLabel,
  title,
  subtitle,
  badge,
  children,
  footer,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full pb-24">
      <div className="mb-5 flex flex-col gap-3 border-b border-[#e2e8f0] pb-5">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[#64748b] transition-colors hover:text-[#0f172a]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-[#64748b]">{subtitle}</p>}
      </div>
      {children}
      {footer}
    </div>
  );
}

export function AdminDetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid items-start gap-5 lg:grid-cols-3', className)}>{children}</div>;
}

export function AdminDetailMain({ children }: { children: ReactNode }) {
  return <div className="min-w-0 space-y-5 lg:col-span-2">{children}</div>;
}

export function AdminDetailAside({ children }: { children: ReactNode }) {
  return <div className="space-y-5 lg:sticky lg:top-4">{children}</div>;
}

export function AdminDetailSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-[#e2e8f0] bg-white p-4 sm:p-5', className)}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[#0f172a]">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-[#64748b]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function AdminDetailInfoGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function AdminDetailInfo({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">{label}</p>
      <div className="mt-1 text-sm font-medium text-[#0f172a]">{value}</div>
    </div>
  );
}

export function AdminFormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[#94a3b8]">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

export function AdminFormTextarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#334155]">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={textareaClass}
      />
    </div>
  );
}

export function AdminFormSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#334155]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {children}
      </select>
    </div>
  );
}

export function AdminFormCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#334155]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-[#cbd5e1]"
      />
      {label}
    </label>
  );
}

export function AdminDetailSaveBar({
  onSave,
  saving,
  extra,
  saveLabel = 'Save Changes',
  savingLabel = 'Saving...',
}: {
  onSave: () => void;
  saving?: boolean;
  extra?: ReactNode;
  saveLabel?: string;
  savingLabel?: string;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e2e8f0] bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:left-[15.5rem] lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
        {extra}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-[#0f172a] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? savingLabel : saveLabel}
        </button>
      </div>
    </div>
  );
}

export function AdminDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-xl bg-white" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-xl bg-white lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-xl bg-white" />
      </div>
    </div>
  );
}

export function AdminDetailEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white py-16 text-center text-sm text-[#94a3b8]">
      {message}
    </div>
  );
}
