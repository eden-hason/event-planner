'use client';

import { useEffect, useState, useTransition, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { ChevronDown, Search, X } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RECORD_PACKAGE_CHANNEL_LABELS } from '@/features/billing/utils';
import type { EventsIndexFilters, EventsIndexPage, EventsIndexTiming } from '../types';
import {
  CREATED_LABELS,
  createdLabel,
  dateRangeLabel,
  eventsIndexHref,
  PAYMENT_LABELS,
  STATUS_LABELS,
  TIMING_LABELS,
} from '../utils/events-index';
import { cn } from '@/lib/utils';

const ANY = 'any';
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Search and the filter bar. Everything lives in the URL, so a filtered view can
 * be shared or reloaded, and the server does the narrowing. Next keeps this
 * component mounted across search-param navigations, so the search box keeps
 * focus while results update under it.
 */
export function EventsIndexToolbar({
  filters,
  eventTypes,
}: {
  filters: EventsIndexFilters;
  eventTypes: EventsIndexPage['eventTypes'];
}) {
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
        router.replace(eventsIndexHref(filters, { q: query }), { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, sentQuery, filters, router]);

  function apply(patch: Partial<EventsIndexFilters>) {
    setSentQuery(query);
    startTransition(() => {
      router.push(eventsIndexHref({ ...filters, q: query }, patch), { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <InputGroup className="bg-card h-10 w-full max-w-[460px]">
        <InputGroupAddon>
          {isPending ? <Spinner /> : <Search />}
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or phone number"
          aria-label="Search events by owner name or phone number"
          className="[&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setQuery('')}>
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      <div className="flex flex-wrap items-center gap-2">
        <TimingToggle value={filters.timing} onChange={(timing) => apply({ timing })} />

        <span className="bg-border mx-1 hidden h-5 w-px sm:block" aria-hidden="true" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButton label="Event type" selection={typesLabel(filters.types, eventTypes)} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            {eventTypes.map((type) => {
              const checked = filters.types.includes(type.key);
              return (
                <DropdownMenuCheckboxItem
                  key={type.key}
                  checked={checked}
                  // Stays open so several types can be picked in one go.
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() =>
                    apply({
                      types: checked
                        ? filters.types.filter((key) => key !== type.key)
                        : [...filters.types, type.key],
                    })
                  }
                >
                  {type.name}
                </DropdownMenuCheckboxItem>
              );
            })}
            {filters.types.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => apply({ types: [] })}>Any type</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <RadioFilter
          label="Payment"
          value={filters.payment}
          options={PAYMENT_LABELS}
          onChange={(payment) => apply({ payment })}
        />

        <RadioFilter
          label="Package"
          value={filters.package}
          options={RECORD_PACKAGE_CHANNEL_LABELS}
          onChange={(channel) => apply({ package: channel })}
        />

        <CreatedFilter filters={filters} apply={apply} />

        <RadioFilter
          label="Status"
          value={filters.status}
          options={STATUS_LABELS}
          onChange={(status) => apply({ status })}
        />
      </div>
    </div>
  );
}

const ALL = 'all';

/** Upcoming / Ended is the switch an Operator flips most, so it is a segmented control, not a menu. */
function TimingToggle({
  value,
  onChange,
}: {
  value: EventsIndexTiming | null;
  onChange: (value: EventsIndexTiming | null) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label="Upcoming or ended events"
      className="bg-card"
      value={value ?? ALL}
      // Radix sends '' when the pressed item is clicked again; All stays pressed instead.
      onValueChange={(next) => next && onChange(next === ALL ? null : (next as EventsIndexTiming))}
    >
      <ToggleGroupItem value={ALL} className="px-3 text-[12.5px]">All</ToggleGroupItem>
      {(Object.entries(TIMING_LABELS) as [EventsIndexTiming, string][]).map(([key, label]) => (
        <ToggleGroupItem key={key} value={key} className="px-3 text-[12.5px]">{label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** The filter bar's button: the filter's name, then what it is set to. */
function FilterButton({
  label,
  selection,
  ...props
}: { label: string; selection: string | null } & ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'bg-card text-[12.5px] font-medium shadow-none',
        selection && 'border-primary/40 bg-primary/5 hover:bg-primary/10',
      )}
      {...props}
    >
      <span className={cn(selection && 'text-muted-foreground font-normal')}>{label}</span>
      {selection && <span>{selection}</span>}
      <ChevronDown className="text-muted-foreground" />
    </Button>
  );
}

function RadioFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: Record<T, string>;
  onChange: (value: T | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FilterButton label={label} selection={value ? options[value] : null} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup
          value={value ?? ANY}
          onValueChange={(next) => onChange(next === ANY ? null : (next as T))}
        >
          <DropdownMenuRadioItem value={ANY}>Any</DropdownMenuRadioItem>
          {(Object.entries(options) as [T, string][]).map(([key, optionLabel]) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {optionLabel}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** When the Event was opened in the system. Presets apply at once; a custom range on Apply. */
function CreatedFilter({
  filters,
  apply,
}: {
  filters: EventsIndexFilters;
  apply: (patch: Partial<EventsIndexFilters>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(filters.created === 'custom');
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: filters.createdFrom ? parseISO(filters.createdFrom) : undefined,
    to: filters.createdTo ? parseISO(filters.createdTo) : undefined,
  }));

  const presets = [
    { value: null, label: 'Any time' },
    { value: 'week' as const, label: CREATED_LABELS.week },
    { value: 'month' as const, label: CREATED_LABELS.month },
  ];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setCustom(filters.created === 'custom');
      }}
    >
      <PopoverTrigger asChild>
        <FilterButton label="Created" selection={createdLabel(filters)} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1">
        <div className="flex flex-col">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setOpen(false);
                apply({ created: preset.value, createdFrom: null, createdTo: null });
              }}
              className={cn(
                'hover:bg-accent rounded-sm px-2 py-1.5 text-left text-sm',
                !custom && filters.created === preset.value && 'font-medium',
              )}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustom(true)}
            className={cn('hover:bg-accent rounded-sm px-2 py-1.5 text-left text-sm', custom && 'font-medium')}
          >
            Custom range
          </button>
        </div>
        {custom && (
          <div className="border-t pt-1">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              defaultMonth={range?.from}
              disabled={{ after: new Date() }}
              numberOfMonths={1}
            />
            <div className="flex items-center justify-between gap-2 px-3 pb-2">
              <span className="text-muted-foreground text-xs">
                {range?.from ? dateRangeLabel(isoDay(range.from), range.to ? isoDay(range.to) : null) : 'Pick the first day'}
              </span>
              <Button
                size="sm"
                disabled={!range?.from}
                onClick={() => {
                  if (!range?.from) return;
                  setOpen(false);
                  apply({
                    created: 'custom',
                    createdFrom: isoDay(range.from),
                    createdTo: isoDay(range.to ?? range.from),
                  });
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function typesLabel(types: string[], eventTypes: EventsIndexPage['eventTypes']): string | null {
  if (types.length > 1) return `${types.length} types`;
  return types[0] ? (eventTypes.find((type) => type.key === types[0])?.name ?? types[0]) : null;
}

/** A picked calendar day as YYYY-MM-DD, in the browser's own calendar. */
function isoDay(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
