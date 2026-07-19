'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ dateRange, onDateRangeChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(dateRange);

  React.useEffect(() => {
    if (!open) setDraft(dateRange);
  }, [dateRange, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Commit partial start-only range when closing, or clear if empty
      if (draft?.from && !draft.to) {
        onDateRangeChange({ from: draft.from, to: draft.from });
      } else if (!draft?.from) {
        onDateRangeChange(undefined);
      }
    } else {
      setDraft(dateRange);
    }
    setOpen(next);
  };

  const handleSelect = (range: DateRange | undefined) => {
    setDraft(range);
    // Wait for both ends before committing — first click must not force end = start
    if (range?.from && range?.to) {
      onDateRangeChange(range);
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(undefined);
    onDateRangeChange(undefined);
    setOpen(false);
  };

  const display = draft ?? dateRange;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-10 items-center justify-start rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm font-medium text-[#334155] transition-colors hover:bg-[#f8fafc] hover:text-[#0f172a]',
              display?.from && 'border-[#cbd5e1] text-[#0f172a]',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-[#64748b]" />
            {display?.from ? (
              display.to ? (
                <>
                  {format(display.from, 'LLL dd, y')} – {format(display.to, 'LLL dd, y')}
                </>
              ) : (
                <>{format(display.from, 'LLL dd, y')} – …</>
              )
            ) : (
              <span>Date</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={display?.from}
            selected={draft}
            onSelect={handleSelect}
            numberOfMonths={2}
            required={false}
          />
        </PopoverContent>
      </Popover>
      {(dateRange?.from || dateRange?.to) && (
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border border-[#e2e8f0] bg-white p-2 text-[#64748b] transition-colors hover:bg-[#f8fafc] hover:text-[#0f172a]"
          title="Clear date filter"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
