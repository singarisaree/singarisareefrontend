import { Search, Plus, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  addLabel?: string;
  onAdd?: () => void;
  addHref?: string;
  children?: React.ReactNode;
  className?: string;
  searchMaxWidth?: string;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

export function DataTableToolbar({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  addLabel,
  onAdd,
  children,
  className,
  searchMaxWidth = 'max-w-md',
  dateRange,
  onDateRangeChange,
}: DataTableToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className={cn('relative flex-1', searchMaxWidth)}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white pl-10 pr-4 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onDateRangeChange && (
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        )}
        {addLabel && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f172a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b]"
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export type FilterTabOption = {
  value: string;
  label: string;
  count?: number;
};

export function FilterTabs({
  options,
  value,
  onChange,
  className,
}: {
  options: FilterTabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto', className)}>
      {options.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            value === tab.value
              ? 'bg-[#0f172a] text-white'
              : 'text-[#64748b] hover:bg-[#f1f5f9]',
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
        </button>
      ))}
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  id,
  label,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const select = (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a] focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[#475569]">
        {label}
      </label>
      {select}
    </div>
  );
}

export function ClearFilters({
  visible,
  onClear,
}: {
  visible: boolean;
  onClear: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm font-medium text-[#64748b] transition-colors hover:bg-[#f8fafc]"
    >
      <X className="h-3.5 w-3.5" />
      Clear
    </button>
  );
}

export function AdminTableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
        {children}
      </tr>
    </thead>
  );
}

export function AdminTh({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('px-5 py-3.5 font-semibold', className)}>{children}</th>;
}

export function AdminTd({ children, className }: { children: React.ReactNode; className?: string }) {
  const safeChildren =
    typeof children === 'number' && Number.isNaN(children) ? '—' : children;
  return <td className={cn('px-5 py-4 text-[#334155]', className)}>{safeChildren}</td>;
}
