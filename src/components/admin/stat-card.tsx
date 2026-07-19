import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconBg = 'bg-blue-50',
  iconColor = 'text-blue-600',
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#64748b]">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">{value}</p>
          {subtext && (
            <p className="mt-1 text-xs font-medium text-[#16a34a]">{subtext}</p>
          )}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
