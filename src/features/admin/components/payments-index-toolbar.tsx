'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search, X } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import type { PaymentsIndexFilters } from '../types';
import {
  amountLabel,
  currentIsraelMonth,
  monthLabel,
  parseAmount,
  paymentsIndexHref,
} from '../utils/payments-index';
import { cn } from '@/lib/utils';
import { FilterButton } from './filter-button';

const SEARCH_DEBOUNCE_MS = 250;
const SHORT_MONTH = new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', month: 'short' });
const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

/**
 * Search and the filter bar. Everything lives in the URL, as on the Events
 * index, so a filtered view can be shared or reloaded and the server does the
 * narrowing. The search box keeps focus while results update under it.
 */
export function PaymentsIndexToolbar({ filters }: { filters: PaymentsIndexFilters }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  // The last query this box sent. When the URL's `q` moves to anything else,
  // something outside changed the search (Clear all, a removed chip) and the
  // box follows; its own echo arriving late must not overwrite newer typing.
  const [sentQuery, setSentQuery] = useState(filters.q);
  const [urlQuery, setUrlQuery] = useState(filters.q);
  if (filters.q !== urlQuery) {
    setUrlQuery(filters.q);
    if (filters.q !== sentQuery) {
      setSentQuery(filters.q);
      setQuery(filters.q);
    }
  }

  useEffect(() => {
    if (query === sentQuery) return;
    const timer = setTimeout(() => {
      setSentQuery(query);
      startTransition(() => {
        router.replace(paymentsIndexHref(filters, { q: query }), { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, sentQuery, filters, router]);

  function apply(patch: Partial<PaymentsIndexFilters>) {
    setSentQuery(query);
    startTransition(() => {
      router.push(paymentsIndexHref({ ...filters, q: query }, patch), { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <InputGroup className="bg-card h-10 w-full max-w-[460px]">
        <InputGroupAddon>{isPending ? <Spinner /> : <Search />}</InputGroupAddon>
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש לפי שם הלקוח"
          aria-label="חיפוש תשלומים לפי שם הלקוח או אימייל"
          className="[&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="ניקוי החיפוש" onClick={() => setQuery('')}>
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      <div className="flex flex-wrap items-center gap-2">
        <MonthFilter value={filters.month} onChange={(month) => apply({ month })} />
        <AmountFilter filters={filters} apply={apply} />
      </div>
    </div>
  );
}

/** A month at a time: a year to step through and its twelve months, nothing past this month. */
function MonthFilter({ value, onChange }: { value: string | null; onChange: (month: string | null) => void }) {
  const current = currentIsraelMonth();
  const currentYear = Number(current.slice(0, 4));
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number((value ?? current).slice(0, 4)));

  function pick(month: string | null) {
    setOpen(false);
    onChange(month);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setYear(Number((value ?? current).slice(0, 4)));
      }}
    >
      <PopoverTrigger asChild>
        <FilterButton label="חודש" selection={value ? monthLabel(value) : null} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex items-center justify-between pb-2">
          {/* Under RTL the earlier year sits on the right, so its arrow points right. */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="השנה הקודמת"
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronRight />
          </Button>
          <span className="text-sm font-medium tabular-nums">{year}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="השנה הבאה"
            disabled={year >= currentYear}
            onClick={() => setYear((y) => y + 1)}
          >
            <ChevronLeft />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((mm) => {
            const month = `${year}-${mm}`;
            const selected = month === value;
            return (
              <Button
                key={mm}
                variant={selected ? 'default' : 'ghost'}
                size="sm"
                disabled={month > current}
                aria-pressed={selected}
                onClick={() => pick(month)}
                className="text-[13px] font-normal"
              >
                {SHORT_MONTH.format(new Date(`${month}-01T00:00:00Z`))}
              </Button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
          <Button variant="ghost" size="sm" onClick={() => pick(current)} className="text-[12.5px]">
            החודש
          </Button>
          {value && (
            <Button variant="ghost" size="sm" onClick={() => pick(null)} className="text-muted-foreground text-[12.5px]">
              כל החודשים
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A shekel range; either end may be left open. Applied on submit, not per keystroke. */
function AmountFilter({
  filters,
  apply,
}: {
  filters: PaymentsIndexFilters;
  apply: (patch: Partial<PaymentsIndexFilters>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const invalid = (!!min.trim() && parseAmount(min) === null) || (!!max.trim() && parseAmount(max) === null);
  const active = filters.minAmount !== null || filters.maxAmount !== null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setMin(filters.minAmount === null ? '' : String(filters.minAmount));
          setMax(filters.maxAmount === null ? '' : String(filters.maxAmount));
        }
      }}
    >
      <PopoverTrigger asChild>
        <FilterButton label="סכום" selection={amountLabel(filters)} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (invalid) return;
            setOpen(false);
            apply({ minAmount: parseAmount(min), maxAmount: parseAmount(max) });
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payments-min-amount" className="text-[12px]">מסכום (₪)</Label>
              <Input
                id="payments-min-amount"
                inputMode="decimal"
                dir="ltr"
                value={min}
                onChange={(event) => setMin(event.target.value)}
                placeholder="0"
                className="h-8 tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payments-max-amount" className="text-[12px]">עד סכום (₪)</Label>
              <Input
                id="payments-max-amount"
                inputMode="decimal"
                dir="ltr"
                value={max}
                onChange={(event) => setMax(event.target.value)}
                placeholder="ללא הגבלה"
                className="h-8 tabular-nums"
              />
            </div>
          </div>
          {invalid && <p className="text-destructive text-[12px]">יש להזין סכום חיובי במספרים</p>}
          <div className={cn('flex items-center gap-2', active ? 'justify-between' : 'justify-end')}>
            {active && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setOpen(false);
                  apply({ minAmount: null, maxAmount: null });
                }}
              >
                כל הסכומים
              </Button>
            )}
            <Button type="submit" size="sm" disabled={invalid}>
              החלה
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
