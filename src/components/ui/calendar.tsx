'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import 'react-day-picker/style.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center h-8',
        caption_label: 'text-sm font-medium text-[#0f172a]',
        nav: 'absolute inset-x-0 top-3 flex items-center justify-between px-2',
        button_previous:
          'h-7 w-7 inline-flex items-center justify-center rounded-md border border-[#e2e8f0] bg-white p-0 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] cursor-pointer z-10',
        button_next:
          'h-7 w-7 inline-flex items-center justify-center rounded-md border border-[#e2e8f0] bg-white p-0 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] cursor-pointer z-10',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-[#64748b] rounded-md w-9 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-2',
        day: 'h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center',
        day_button:
          'h-9 w-9 p-0 font-normal cursor-pointer rounded-md hover:bg-[#f1f5f9] text-[#0f172a] inline-flex items-center justify-center',
        range_start: 'bg-[#0f172a] rounded-l-md [&>button]:text-white [&>button]:hover:bg-[#0f172a]',
        range_end: 'bg-[#0f172a] rounded-r-md [&>button]:text-white [&>button]:hover:bg-[#0f172a]',
        range_middle: 'bg-[#e2e8f0] rounded-none [&>button]:text-[#0f172a] [&>button]:hover:bg-[#cbd5e1]',
        selected: 'bg-[#0f172a] [&>button]:text-white [&>button]:hover:bg-[#0f172a]',
        today: '[&>button]:font-semibold [&>button]:underline',
        outside: 'text-[#94a3b8] opacity-50',
        disabled: 'text-[#94a3b8] opacity-50 cursor-not-allowed',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
