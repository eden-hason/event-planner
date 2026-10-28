'use client';

import { useMemo, useState, type ComponentType } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconBrandWhatsapp,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconInfoCircle,
  IconNote,
  IconPhone,
  IconPhoneOff,
  IconSearch,
  IconSearchOff,
  IconUsers,
  IconX,
  type IconProps,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { avatarTintFor } from '@/lib/avatar-tint';
import { formatPhone } from '@/lib/phone';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { rsvpPresentation } from '@/features/guests';

import type { CallRoundGuestRow } from '../types';
import { callOutcomePresentation } from '../utils/outcome-presentation';
import {
  availableFilters,
  filterGuestRows,
  guestCallStatus,
  type GuestCallStatus,
  type GuestFilter,
} from '../utils/round-results';

/** Rows shown before "show more" on a phone, and how many each press adds. */
const PHONE_FIRST = 6;
const PHONE_STEP = 20;
/** Rows per page in the table. */
const TABLE_PAGE = 10;

type Icon = ComponentType<IconProps>;

/*
 * The hues a status disc and its word can take. Confirmed and declined are the
 * RSVP colours, because that is what those calls became; no answer is neutral;
 * a guest still waiting for the call has no colour at all, only a dashed ring.
 */
type Tone = 'confirmed' | 'declined' | 'pending' | 'noAnswer' | 'notCalled';

const TONE: Record<Tone, { disc: string; text: string }> = {
  confirmed: {
    disc: rsvpPresentation('confirmed').chip,
    text: rsvpPresentation('confirmed').text,
  },
  declined: {
    disc: rsvpPresentation('declined').chip,
    text: rsvpPresentation('declined').text,
  },
  pending: {
    disc: rsvpPresentation('pending').chip,
    text: rsvpPresentation('pending').text,
  },
  noAnswer: {
    disc: callOutcomePresentation('no_answer').chip,
    text: callOutcomePresentation('no_answer').text,
  },
  notCalled: {
    disc: 'border-muted-foreground/40 text-muted-foreground border-[1.5px] border-dashed',
    text: 'text-muted-foreground',
  },
};

const KIND_ICON: Record<Exclude<GuestCallStatus['kind'], 'answeredFirst'>, Icon> = {
  confirmed: IconCheck,
  declined: IconX,
  noAnswer: IconPhoneOff,
  notCalled: IconPhone,
};

const RSVP_ICON: Record<CallRoundGuestRow['currentRsvpStatus'], Icon> = {
  confirmed: IconCheck,
  declined: IconX,
  pending: IconClock,
};

/** The dot each filter chip carries, matching the disc its guests show. */
const FILTER_DOT: Partial<Record<GuestFilter, string>> = {
  awaiting: 'border-[1.5px] border-current opacity-70',
  confirmed: 'bg-rsvp-confirmed',
  declined: 'bg-rsvp-declined',
  noAnswer: 'bg-muted-foreground/60',
};

const DISC_SIZE = {
  sm: 'size-[26px]',
  md: 'size-8',
  detail: 'size-7',
} as const;

/**
 * What a guest's row leads with: the call when there was one, else the RSVP
 * the guest gave on WhatsApp before we reached them, marked as such by the
 * WhatsApp glyph rather than a check that would read as "confirmed on the call".
 */
function primaryOf(row: CallRoundGuestRow, status: GuestCallStatus): { tone: Tone; icon: Icon } {
  if (status.kind === 'answeredFirst') {
    return {
      tone: row.currentRsvpStatus === 'declined' ? 'declined' : 'confirmed',
      icon: IconBrandWhatsapp,
    };
  }
  return { tone: status.kind, icon: KIND_ICON[status.kind] };
}

function primaryLabelKey(row: CallRoundGuestRow, status: GuestCallStatus) {
  if (status.kind === 'answeredFirst') {
    return row.currentRsvpStatus === 'declined' ? 'declined' : 'confirmed';
  }
  return status.kind;
}

function StatusDisc({
  tone,
  icon: Glyph,
  size,
}: {
  tone: Tone;
  icon: Icon;
  size: keyof typeof DISC_SIZE;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        DISC_SIZE[size],
        TONE[tone].disc,
      )}
    >
      <Glyph size={size === 'md' ? 16 : 14} stroke={2} />
    </span>
  );
}

/** The status word, and the RSVP after it when it says something the call did not. */
function StatusLine({ row, status }: { row: CallRoundGuestRow; status: GuestCallStatus }) {
  const t = useTranslations('calls.guests');
  const { tone } = primaryOf(row, status);

  return (
    <>
      <span className={cn('shrink-0 font-medium whitespace-nowrap', TONE[tone].text)}>
        {t(`status.${primaryLabelKey(row, status)}`)}
      </span>
      {status.kind === 'answeredFirst' && (
        <>
          <span aria-hidden className="text-muted-foreground shrink-0">
            ·
          </span>
          <span className="text-muted-foreground min-w-0 truncate">{t('answeredFirst')}</span>
        </>
      )}
      {status.now && (
        <>
          <span aria-hidden className="text-muted-foreground shrink-0">
            ·
          </span>
          <span className={cn('shrink-0 font-medium whitespace-nowrap', TONE[status.now].text)}>
            {t(`now.${status.now}`)}
          </span>
        </>
      )}
    </>
  );
}

function firstLine(notes: string) {
  return notes.split('\n')[0];
}

/**
 * Every guest the round was put to, one line each: how the call ended, the RSVP
 * when it has moved since, and whether the caller left a note. Everything else -
 * the full note, why a guest was skipped - waits in a details sheet framed like
 * the Guests page drawer: rising from the bottom on a phone, floating in from the
 * end side on a wide screen.
 *
 * The call and the RSVP stay separate on purpose. A guest on the call list can
 * confirm by WhatsApp the next day and be skipped, leaving the call outcome
 * empty for good; showing only the outcome would read as "your planner never
 * called them", so the row says they answered first.
 *
 * Built for a hundred guests: search and outcome filters narrow the list, a
 * phone reveals it in steps, and a wide screen pages a table.
 */
export function CallRoundGuestList({ guests }: { guests: CallRoundGuestRow[] }) {
  const t = useTranslations('calls.guests');
  const isRTL = useLocale() === 'he';
  const isMobile = useIsMobile();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [phoneCount, setPhoneCount] = useState(PHONE_FIRST);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const filters = useMemo(() => availableFilters(guests), [guests]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        filters.map((key) => [key, filterGuestRows(guests, { filter: key, query: '' }).length]),
      ) as Partial<Record<GuestFilter, number>>,
    [guests, filters],
  );
  const rows = useMemo(() => filterGuestRows(guests, { filter, query }), [guests, filter, query]);
  const open = guests.find((g) => g.guestId === openId) ?? null;

  const totalPages = Math.ceil(rows.length / TABLE_PAGE);
  // A filter can leave fewer pages than the one being viewed.
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  const tableRows = rows.slice(safePage * TABLE_PAGE, (safePage + 1) * TABLE_PAGE);
  const phoneRows = rows.slice(0, phoneCount);
  const remaining = rows.length - phoneRows.length;

  const narrow = (next: () => void) => {
    next();
    setPhoneCount(PHONE_FIRST);
    setPage(0);
  };

  const Forward = isRTL ? IconChevronLeft : IconChevronRight;
  const Back = isRTL ? IconChevronRight : IconChevronLeft;
  const trimmed = query.trim();

  return (
    <section className="bg-card flex flex-col overflow-hidden rounded-2xl border">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-2 xl:px-5 xl:pt-5">
        <div className="flex items-baseline justify-between gap-2.5 xl:justify-start">
          <h3 className="text-[17px] font-semibold xl:text-lg">{t('title')}</h3>
          <span className="text-muted-foreground text-[13px] xl:text-sm">
            {t('count', { count: guests.length })}
          </span>
        </div>

        <div className="relative xl:w-[300px]">
          <IconSearch
            size={18}
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => narrow(() => setQuery(e.target.value))}
            placeholder={t('search')}
            aria-label={t('searchLabel')}
            className="bg-background h-11 rounded-[10px] ps-10 text-[15px] xl:h-10 xl:text-sm"
          />
        </div>
      </div>

      {filters.length > 2 && (
        <div
          role="group"
          aria-label={t('filtersLabel')}
          className="flex gap-1.5 overflow-x-auto px-4 pb-1.5 [scrollbar-width:none] xl:px-5 xl:pb-2.5 [&::-webkit-scrollbar]:hidden"
        >
          {filters.map((key) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => narrow(() => setFilter(key))}
                className="h-11 shrink-0 xl:h-10"
              >
                <span
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card text-foreground hover:bg-accent',
                  )}
                >
                  {FILTER_DOT[key] && (
                    <span
                      aria-hidden
                      className={cn('size-[7px] shrink-0 rounded-full', FILTER_DOT[key])}
                    />
                  )}
                  {t(`filters.${key}`)}
                  <span
                    className={cn(
                      'text-[13px] font-normal tabular-nums',
                      active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {counts[key]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {rows.length === 0 && (
        <div className="flex flex-col items-center gap-1.5 border-t px-6 pt-10 pb-8 text-center xl:pt-16 xl:pb-[72px]">
          <span className="bg-muted text-muted-foreground mb-1.5 inline-flex size-12 items-center justify-center rounded-full">
            <IconSearchOff size={22} stroke={1.75} />
          </span>
          <p className="text-[15px] font-semibold xl:text-base">{t('empty.title')}</p>
          <p className="text-muted-foreground max-w-[260px] text-[13px] leading-5 xl:max-w-80 xl:text-sm">
            {trimmed
              ? filter === 'all'
                ? t('empty.query', { query: trimmed })
                : t('empty.queryInFilter', {
                    query: trimmed,
                    filter: t(`filters.${filter}`),
                  })
              : t('empty.filter')}
          </p>
          <Button
            variant="outline"
            className="mt-2.5 h-11 rounded-[10px] xl:h-10"
            onClick={() => narrow(() => (trimmed ? setQuery('') : setFilter('all')))}
          >
            {trimmed ? t('empty.clearSearch') : t('empty.showAll')}
          </Button>
        </div>
      )}

      <div>
        {/* Below xl the columns cannot sit side by side beside the timeline, so
            each guest is one line, and a tap opens the rest. */}
        {rows.length > 0 && (
          <div className="xl:hidden">
            <ItemGroup className="border-t">
              {phoneRows.map((row) => {
                const status = guestCallStatus(row);
                const { tone, icon } = primaryOf(row, status);
                return (
                  <div key={row.guestId} role="listitem" className="border-b">
                    <Item
                      asChild
                      size="sm"
                      className={cn(
                        'hover:bg-accent min-h-16 w-full flex-nowrap gap-3 rounded-none border-0 px-4 py-2.5 text-start',
                        row.guestId === openId && 'bg-accent',
                      )}
                    >
                      <button type="button" onClick={() => setOpenId(row.guestId)}>
                        <ItemMedia>
                          <StatusDisc tone={tone} icon={icon} size="md" />
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-0.5">
                          <ItemTitle className="w-full min-w-0 gap-1.5 text-[15px] leading-[22px]">
                            <span className="min-w-0 truncate">{row.guestName}</span>
                            {row.amount > 1 && (
                              <span className="bg-muted text-muted-foreground inline-flex h-5 shrink-0 items-center gap-[3px] rounded-full px-[7px] text-xs font-medium tabular-nums">
                                <IconUsers size={12} aria-hidden />
                                <span className="sr-only">
                                  {t('people', { count: row.amount })}
                                </span>
                                <span aria-hidden>{row.amount}</span>
                              </span>
                            )}
                          </ItemTitle>
                          <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[13px] leading-[18px]">
                            <StatusLine row={row} status={status} />
                            {row.notes && (
                              <>
                                <span aria-hidden className="shrink-0">
                                  ·
                                </span>
                                <span className="flex min-w-0 flex-1 items-center gap-1">
                                  <IconNote
                                    size={14}
                                    stroke={1.75}
                                    aria-hidden
                                    className="shrink-0"
                                  />
                                  <span className="sr-only">{t('noteSr')}</span>
                                  <span className="truncate">{firstLine(row.notes)}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </ItemContent>
                        <ItemActions>
                          <Forward
                            size={18}
                            stroke={1.75}
                            aria-hidden
                            className="text-muted-foreground"
                          />
                        </ItemActions>
                      </button>
                    </Item>
                  </div>
                );
              })}
            </ItemGroup>
            {remaining > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-muted-foreground text-[13px] tabular-nums">
                  {t('shown', { shown: phoneRows.length, total: rows.length })}
                </span>
                <Button
                  variant="outline"
                  className="h-11 rounded-[10px] px-4"
                  onClick={() => setPhoneCount((n) => n + PHONE_STEP)}
                >
                  {t('showMore', { count: Math.min(remaining, PHONE_STEP) })}
                </Button>
              </div>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="hidden xl:block">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[150px]" />
                <col className="w-[80px]" />
                <col className="w-[28%]" />
                <col />
                <col className="w-[52px]" />
              </colgroup>
              <TableHeader>
                <TableRow className="border-t hover:bg-transparent">
                  {(['guest', 'phone', 'amount', 'status', 'note'] as const).map((column) => (
                    <TableHead
                      key={column}
                      className="text-muted-foreground h-10 px-3 text-[13px] font-medium first:ps-5"
                    >
                      {t(`columns.${column}`)}
                    </TableHead>
                  ))}
                  <TableHead className="h-10">
                    <span className="sr-only">{t('columns.open')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row) => {
                  const status = guestCallStatus(row);
                  const { tone, icon } = primaryOf(row, status);
                  return (
                    <TableRow
                      key={row.guestId}
                      onClick={() => setOpenId(row.guestId)}
                      data-state={row.guestId === openId ? 'selected' : undefined}
                      className="hover:bg-accent data-[state=selected]:bg-accent h-[52px] cursor-pointer"
                    >
                      <TableCell className="px-3 ps-5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(row.guestId);
                          }}
                          className="block w-full truncate text-start text-sm font-medium"
                        >
                          {row.guestName}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 text-sm tabular-nums">
                        {row.phone ? (
                          <bdi dir="ltr">{formatPhone(row.phone)}</bdi>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'px-3 tabular-nums',
                          row.amount > 1 ? 'font-medium' : 'text-muted-foreground',
                        )}
                      >
                        {row.amount}
                      </TableCell>
                      <TableCell className="px-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm">
                          <StatusDisc tone={tone} icon={icon} size="sm" />
                          <StatusLine row={row} status={status} />
                        </span>
                      </TableCell>
                      <TableCell className="px-3">
                        {row.notes && (
                          <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
                            <IconNote size={15} stroke={1.75} aria-hidden className="shrink-0" />
                            <span className="truncate">{firstLine(row.notes)}</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-3">
                        <Forward
                          size={18}
                          stroke={1.75}
                          aria-hidden
                          className="text-muted-foreground"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-muted-foreground text-[13px] tabular-nums">
                  {t('pager', {
                    from: safePage * TABLE_PAGE + 1,
                    to: Math.min((safePage + 1) * TABLE_PAGE, rows.length),
                    total: rows.length,
                  })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-10 gap-1 rounded-[10px] px-3"
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 0}
                  >
                    <Back size={16} stroke={1.75} />
                    {t('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 gap-1 rounded-[10px] px-3"
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage >= totalPages - 1}
                  >
                    {t('next')}
                    <Forward size={16} stroke={1.75} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={!!open} onOpenChange={(next) => !next && setOpenId(null)}>
        <SheetContent
          side={isMobile ? 'bottom' : isRTL ? 'left' : 'right'}
          dir={isRTL ? 'rtl' : 'ltr'}
          showCloseButton={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            'flex flex-col gap-0 overflow-hidden p-0',
            isMobile
              ? 'max-h-[92dvh] rounded-t-[24px] border-0'
              : 'm-3 h-[calc(100dvh-1.5rem)] rounded-[18px] border sm:max-w-[480px]',
          )}
        >
          {open && <GuestDetails row={open} compact={isMobile} />}
        </SheetContent>
      </Sheet>
    </section>
  );
}

/**
 * Everything the row only hints at: how the call went and the RSVP now, each
 * with its disc, why the two differ when they do, and the caller's note in full.
 */
function GuestDetails({ row, compact }: { row: CallRoundGuestRow; compact: boolean }) {
  const t = useTranslations('calls.guests');
  const tRsvp = useTranslations('calls.rsvp');
  const status = guestCallStatus(row);
  const primary = primaryOf(row, status);
  const skipped = status.kind === 'answeredFirst';
  const call = skipped ? { tone: 'notCalled' as const, icon: IconBrandWhatsapp } : primary;
  const rsvp = row.currentRsvpStatus;

  return (
    <>
      <div
        className={cn(
          'flex items-start border-b text-start',
          compact ? 'gap-[11px] px-4 pt-5 pb-3.5' : 'gap-3 px-5 pt-[18px] pb-4',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-bold',
            avatarTintFor(row.guestName),
          )}
        >
          {row.guestName.charAt(0)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
          <SheetTitle
            className={cn('leading-tight font-extrabold', compact ? 'text-lg' : 'text-[19px]')}
          >
            {row.guestName}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <IconUsers size={15} stroke={1.75} aria-hidden />
            {t('people', { count: row.amount })}
          </SheetDescription>
        </div>
        <SheetClose
          aria-label={t('details.close')}
          className="bg-muted text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
        >
          <IconX size={16} stroke={2.2} />
        </SheetClose>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto text-start',
          compact
            ? 'gap-4 px-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))]'
            : 'gap-[18px] px-5 pt-4 pb-5',
        )}
      >
        <dl className="rounded-xl border">
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-b px-3.5">
            <dt className="text-muted-foreground text-sm">{t('details.phone')}</dt>
            <dd className="text-[15px] font-medium tabular-nums">
              {row.phone ? (
                <bdi dir="ltr">{formatPhone(row.phone)}</bdi>
              ) : (
                <span className="text-muted-foreground text-sm font-normal">
                  {t('details.noPhone')}
                </span>
              )}
            </dd>
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-b px-3.5">
            <dt className="text-muted-foreground text-sm">{t('details.call')}</dt>
            <dd className="flex items-center gap-2 text-sm">
              <StatusDisc tone={call.tone} icon={call.icon} size="detail" />
              <span className={cn('font-medium', TONE[call.tone].text)}>
                {skipped ? t('details.skipped') : t(`status.${primaryLabelKey(row, status)}`)}
              </span>
            </dd>
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 px-3.5">
            <dt className="text-muted-foreground text-sm">{t('details.rsvp')}</dt>
            <dd className="flex items-center gap-2 text-sm">
              <StatusDisc tone={rsvp} icon={RSVP_ICON[rsvp]} size="detail" />
              <span className={cn('font-medium', TONE[rsvp].text)}>{tRsvp(rsvp)}</span>
            </dd>
          </div>
        </dl>

        {status.explain && (
          <div className="bg-muted flex gap-2.5 rounded-xl px-3.5 py-3 text-sm leading-[21px]">
            {skipped ? (
              <IconBrandWhatsapp
                size={18}
                stroke={1.75}
                aria-hidden
                className="text-muted-foreground mt-px shrink-0"
              />
            ) : (
              <IconInfoCircle
                size={18}
                stroke={1.75}
                aria-hidden
                className="text-muted-foreground mt-px shrink-0"
              />
            )}
            <span>{t(`details.explain.${status.explain}`)}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[13px] font-semibold">
            <IconNote size={15} stroke={1.75} aria-hidden />
            {t('details.note')}
          </div>
          {row.notes ? (
            <p className="rounded-xl border px-4 py-3.5 text-[15px] leading-6 break-words whitespace-pre-line">
              {row.notes}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">{t('details.noNote')}</p>
          )}
        </div>
      </div>
    </>
  );
}
