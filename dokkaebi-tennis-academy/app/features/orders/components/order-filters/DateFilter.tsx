// app/admin/orders/_components/order-filters/DateFilter.tsx
'use client';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';

interface DateFilterProps {
  date: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

export function DateFilter({ date, onChange }: DateFilterProps) {
  const handleToday = () => onChange(new Date());
  return (
    <div className="flex items-center space-x-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="p-1"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <CalendarIcon className="w-4 h-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent side="bottom" align="start" sideOffset={4} className="z-50 !w-auto min-w-max p-0 bg-transparent border-0 shadow-none overflow-visible">
          <div className="bg-white border border-gray-200 rounded-md shadow-md overflow-hidden">
            <Calendar selected={date} onSelect={onChange} />
          </div>
        </PopoverContent>
      </Popover>

      {/* 캘린더 옆 Today 버튼 */}
      {/* <Button variant="link" size="sm" className="text-primary hover:underline" onClick={handleToday}>
        오늘
      </Button> */}
    </div>
  );
}
