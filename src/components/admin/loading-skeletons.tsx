import { cn } from '@/lib/utils';

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('h-[7.25rem] animate-pulse rounded-xl border border-[#e2e8f0] bg-white', className)} />
  );
}

export function AdminTableSkeleton({
  rows = 6,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="animate-pulse">
          {Array.from({ length: cols }).map((__, col) => (
            <td key={col} className="px-5 py-4">
              <div
                className={cn(
                  'h-4 rounded bg-[#e2e8f0]',
                  col === 0 ? 'w-3/4' : col === cols - 1 ? 'w-16' : 'w-1/2',
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-[#e2e8f0]" />
              <div className="h-3 w-24 rounded bg-[#e2e8f0]" />
            </div>
            <div className="flex gap-1">
              <div className="h-8 w-8 rounded-lg bg-[#e2e8f0]" />
              <div className="h-8 w-8 rounded-lg bg-[#e2e8f0]" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-4 w-24 rounded bg-[#e2e8f0]" />
            <div className="h-5 w-12 rounded-full bg-[#e2e8f0]" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-[#e2e8f0]" />
            <div className="h-3 w-5/6 rounded bg-[#e2e8f0]" />
            <div className="h-3 w-2/3 rounded bg-[#e2e8f0]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex animate-pulse justify-between">
          <div className="h-4 w-24 rounded bg-[#e2e8f0]" />
          <div className="h-4 w-20 rounded bg-[#e2e8f0]" />
        </div>
      ))}
    </div>
  );
}
