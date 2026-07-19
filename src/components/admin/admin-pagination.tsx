'use client';

import ReactPaginate from 'react-paginate';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  paginationRange,
  type PaginationMeta,
  type PageSizeOption,
} from '@/lib/pagination';

interface AdminPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (limit: PageSizeOption) => void;
  className?: string;
}

export function AdminPagination({
  meta,
  onPageChange,
  onPageSizeChange,
  className,
}: AdminPaginationProps) {
  if (meta.total === 0) return null;

  const { from, to } = paginationRange(meta);
  const showPager = meta.totalPages > 1;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-[#e2e8f0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-[#64748b]">
        <span>
          Showing <span className="font-medium text-[#0f172a]">{from}</span>
          {' – '}
          <span className="font-medium text-[#0f172a]">{to}</span>
          {' of '}
          <span className="font-medium text-[#0f172a]">{meta.total}</span>
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span className="text-xs">Rows</span>
            <select
              value={meta.limit}
              onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSizeOption)}
              className="h-8 rounded-lg border border-[#e2e8f0] bg-white px-2 text-xs text-[#0f172a] focus:border-[#0f172a] focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {showPager && (
        <ReactPaginate
          pageCount={meta.totalPages}
          forcePage={meta.page - 1}
          onPageChange={({ selected }) => onPageChange(selected + 1)}
          marginPagesDisplayed={1}
          pageRangeDisplayed={3}
          breakLabel="…"
          previousLabel={
            <span className="inline-flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              Prev
            </span>
          }
          nextLabel={
            <span className="inline-flex items-center gap-1">
              Next
              <ChevronRight className="h-4 w-4" />
            </span>
          }
          containerClassName="flex flex-wrap items-center gap-1"
          pageClassName="inline-flex"
          pageLinkClassName="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#f1f5f9]"
          activeClassName="[&>a]:bg-[#0f172a] [&>a]:text-white [&>a]:hover:bg-[#1e293b]"
          previousClassName="inline-flex"
          nextClassName="inline-flex"
          previousLinkClassName="flex h-8 items-center rounded-lg px-2.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#f1f5f9] disabled:opacity-40"
          nextLinkClassName="flex h-8 items-center rounded-lg px-2.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#f1f5f9] disabled:opacity-40"
          breakClassName="inline-flex"
          breakLinkClassName="flex h-8 min-w-8 items-center justify-center text-xs text-[#94a3b8]"
          disabledClassName="opacity-40 pointer-events-none"
        />
      )}
    </div>
  );
}

export { DEFAULT_PAGE_SIZE };
