'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from '@/components/icons';
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
  parseAmount,
  paymentsIndexHref,
  yearPatch,
} from '../utils/payments-index';
import { cn } from '@/lib/utils';
import { FilterButton } from './filter-button';

const SEARCH_DEBOUNCE_MS = 250;
const SHORT_MONTH = new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', month: 'short' });
const LONG_MONTH = new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', month: 'long' });
const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

/**
 * Search and the filter bar. Everything lives in the URL, as on the Events
 * index, so a filtered view can be shared or reloaded and the server does the
 * narrowing. The search box keeps focus while results update under it.
 */
export function PaymentsIndexToolbar({ filters, years }: { filters: PaymentsIndexFilters; years: string[] }) {
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
        <YearFilter filters={filters} years={years} apply={apply} />
        <MonthFilter filters={filters} apply={apply} />
        <AmountFilter filters={filters} apply={apply} />
      </div>
    </div>
  );
}

/** Every year with a payment, newest first. Picking one shows that whole year until a month narrows it. */
function YearFilter({
  filters,
  years,
  apply,
}: {
  filters: PaymentsIndexFilters;
  years: string[];
  apply: (patch: Partial<PaymentsIndexFilters>) => void;
}) {
  const [open, setOpen] = useState(false);
  // A year typed into the URL with no payments in it still shows as picked.
  const options = filters.year && !years.includes(filters.year)
    ? [...years, filters.year].sort((a, b) => b.localeCompare(a))
    : years;

  function pick(year: string | null) {
    setOpen(false);
    apply(yearPatch(filters, year));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterButton label="שנה" selection={filters.year} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="grid grid-cols-3 gap-1">
          {options.map((year) => {
            const selected = year === filters.year;
            return (
              <Button
                key={year}
                variant={selected ? 'default' : 'ghost'}
                size="sm"
                aria-pressed={selected}
                onClick={() => pick(year)}
                className="text-[13px] font-normal tabular-nums"
              >
                {year}
              </Button>
            );
          })}
        </div>
        {filters.year && (
          <div className="mt-2 flex justify-end border-t pt-2">
            <Button variant="ghost" size="sm" onClick={() => pick(null)} className="text-muted-foreground text-[12.5px]">
              כל השנים
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The twelve months of the chosen year - this year when none is chosen yet -
 * with nothing past this month. Clearing the month keeps the year.
 */
function MonthFilter({
  filters,
  apply,
}: {
  filters: PaymentsIndexFilters;
  apply: (patch: Partial<PaymentsIndexFilters>) => void;
}) {
  const current = currentIsraelMonth();
  const year = filters.year ?? current.slice(0, 4);
  const [open, setOpen] = useState(false);

  function pick(month: string | null) {
    setOpen(false);
    apply(month ? { year: month.slice(0, 4), month } : { year, month: null });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterButton label="חודש" selection={filters.month ? monthName(filters.month) : null} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="text-muted-foreground px-1 pb-2 text-[12px]">
          חודשי <span className="text-foreground font-medium tabular-nums">{year}</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((mm) => {
            const month = `${year}-${mm}`;
            const selected = month === filters.month;
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
          {filters.month && (
            <Button variant="ghost" size="sm" onClick={() => pick(null)} className="text-muted-foreground text-[12.5px]">
              כל {year}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** "אוקטובר", from YYYY-MM - the year is already on the year button. */
function monthName(month: string) {
  return LONG_MONTH.format(new Date(`${month}-01T00:00:00Z`));
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
