'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '@/lib/utils';

type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm text-[13px] w-[220px] border border-gray-200',
        '[&_.rdp-month]:space-y-2',
        '[&_.rdp-caption]:flex [&_.rdp-caption]:justify-between [&_.rdp-caption]:items-center',
        '[&_.rdp-caption_label]:font-medium',
        '[&_.rdp-nav_button]:text-gray-500 [&_.rdp-nav_button]:hover:text-black',
        '[&_.rdp-table]:w-full [&_.rdp-head_cell]:text-gray-400 [&_.rdp-head_cell]:font-normal [&_.rdp-head_cell]:pb-1',
        '[&_.rdp-day]:w-8 [&_.rdp-day]:h-8 [&_.rdp-day]:text-center [&_.rdp-day]:rounded-full',
        '[&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-white',
        '[&_.rdp-day_today]:font-semibold [&_.rdp-day_today]:text-primary',
        className
      )}
    >
      <DayPicker showOutsideDays fixedWeeks className="m-0 p-2" {...props} />
    </div>
  );
}
