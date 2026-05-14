'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useLocale } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const locale = useLocale();
  const dateFnsLocale = locale === 'he' ? he : enUS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-start font-normal',
            !date && 'text-muted-foreground',
          )}
          disabled={disabled}
        >
          <CalendarIcon className="me-2 h-4 w-4" />
          {date ? format(date, 'PPP', { locale: dateFnsLocale }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onDateChange?.(d);
            setOpen(false);
          }}
          locale={dateFnsLocale}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
