'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type {
  GroupWithGuestsApp,
  GuestWithGroupApp,
} from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { amountDisplay } from '@/features/guests/utils/guest-amount';
import type { HeaderState } from '@/features/guests/utils/guest-selection';
import type { MealChoice } from '@/lib/meal-choices';
import { formatPhone } from '@/lib/phone';
import { avatarTintFor } from '@/lib/avatar-tint';
import { cn } from '@/lib/utils';
import { SelectBox } from './select-box';
import { SideBadge } from '../side-badge';
import { AmountBadge } from '../amount-badge';
import { GuestRowMenu, type RowAction } from './guest-row-menu';
import { OutsidePackageTag } from '../package';

/** Fixed row height: the list is virtualized, so rows must never grow. */
const ROW_HEIGHT = 44;

/**
 * The columns follow the page's width (`@container/guests`), not the window's:
 * narrower, the table and meals columns go first, then phone and group. Name,
 * RSVP and the count always stay. Each set is a CSS variable, so the switch is
 * pure CSS and a row never waits on a measurement.
 */
const GRID =
  '[grid-template-columns:var(--cols)] @max-4xl/guests:[grid-template-columns:var(--cols-mid)] @max-2xl/guests:[grid-template-columns:var(--cols-narrow)]';
/** Hidden once the page is narrower than 56rem. */
const WIDE_ONLY = '@max-4xl/guests:hidden';
/** Hidden once the page is narrower than 42rem. */
const MID_UP = '@max-2xl/guests:hidden';

function gridColumns(showMeals: boolean): CSSProperties {
  return {
    '--cols': showMeals
      ? '44px minmax(0,1.7fr) 124px minmax(0,1.1fr) 150px 76px 56px minmax(0,1fr) 44px'
      : '44px minmax(0,1.9fr) 124px minmax(0,1.2fr) 150px 76px 56px 44px',
    '--cols-mid': '44px minmax(0,1.9fr) 124px minmax(0,1.2fr) 150px 76px 44px',
    '--cols-narrow': '44px minmax(0,1fr) 150px 76px 44px',
  } as CSSProperties;
}

const MEAL_LABEL_KEY: Record<MealChoice, string> = {
  vegan: 'vegan',
  vegetarian: 'vegetarian',
  strictly_kosher: 'strictlyKosher',
  gluten_free: 'glutenFree',
};

interface GuestTableProps {
  rows: GuestWithGroupApp[];
  groups: GroupWithGuestsApp[];
  selected: ReadonlySet<string>;
  headerState: HeaderState;
  showMeals: boolean;
  tableNumberById: Map<string, number>;
  recentlyUpdatedId: string | null;
  /** Guest Records outside the Record Package - tagged, never taller. */
  outsideIds: ReadonlySet<string>;
  onToggleAll: () => void;
  onToggle: (id: string, shiftKey: boolean) => void;
  onOpen: (guest: GuestWithGroupApp) => void;
  onRowAction: (guest: GuestWithGroupApp, action: RowAction) => void;
}

/**
 * The guest list as one continuous, virtualized table - no pages, no height
 * cap. The window is the scroller, so the page's sticky toolbar and the
 * table's sticky header stay in the normal document flow.
 */
export function GuestTable({
  rows,
  groups,
  selected,
  headerState,
  showMeals,
  tableNumberById,
  recentlyUpdatedId,
  outsideIds,
  onToggleAll,
  onToggle,
  onOpen,
  onRowAction,
}: GuestTableProps) {
  const t = useTranslations('guests');
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Where the rows start in the document. It moves when the meter or the chip
  // row above it appears or goes, so it is measured after every render; the
  // threshold is what keeps the set from re-triggering itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const top = bodyRef.current
      ? bodyRef.current.getBoundingClientRect().top + window.scrollY
      : 0;
    if (Math.abs(top - scrollMargin) > 0.5) setScrollMargin(top);
  });

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin,
  });

  return (
    // The table's top edge - border and rounded corners - lives on the sticky
    // header, not on this box, so it stays when the rows scroll under it. The
    // header's square backing (`-mx-px` over the side borders) keeps rows from
    // showing through its rounded corners. The column variables are set here
    // once and inherited by the header and every row.
    <div className="bg-card border-x" style={gridColumns(showMeals)}>
      <div className="bg-card sticky top-[calc(var(--page-header-h,0px)+var(--guest-tabs-h,0px)+var(--guest-toolbar-h,60px)+var(--guest-count-h,0px))] z-10 -mx-px">
        <div
          role="row"
          className={cn(
            'bg-card text-muted-foreground grid h-[38px] items-center rounded-t-xl border text-xs font-semibold',
            GRID,
          )}
        >
          <span className="h-full">
            <SelectBox
              state={headerState}
              label={t('list.columns.selectAll')}
              onClick={onToggleAll}
            />
          </span>
          <span>{t('list.columns.name')}</span>
          <span className={MID_UP}>{t('list.columns.phone')}</span>
          <span className={MID_UP}>{t('list.columns.group')}</span>
          <span>{t('list.columns.rsvp')}</span>
          <span>{t('list.columns.amount')}</span>
          <span className={WIDE_ONLY}>{t('list.columns.table')}</span>
          {showMeals && (
            <span className={WIDE_ONLY}>{t('list.columns.meals')}</span>
          )}
          <span />
        </div>
      </div>

      <div
        ref={bodyRef}
        role="rowgroup"
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const guest = rows[item.index];
          return (
            <GuestRow
              key={guest.id}
              guest={guest}
              groups={groups}
              top={item.start - virtualizer.options.scrollMargin}
              checked={selected.has(guest.id)}
              showMeals={showMeals}
              tableNumber={
                guest.tableId ? tableNumberById.get(guest.tableId) : undefined
              }
              flash={guest.id === recentlyUpdatedId}
              outside={outsideIds.has(guest.id)}
              onToggle={(event) => onToggle(guest.id, event.shiftKey)}
              onOpen={() => onOpen(guest)}
              onAction={(action) => onRowAction(guest, action)}
            />
          );
        })}
      </div>
    </div>
  );
}

function GuestRow({
  guest,
  groups,
  top,
  checked,
  showMeals,
  tableNumber,
  flash,
  outside,
  onToggle,
  onOpen,
  onAction,
}: {
  guest: GuestWithGroupApp;
  groups: GroupWithGuestsApp[];
  top: number;
  checked: boolean;
  showMeals: boolean;
  tableNumber: number | undefined;
  flash: boolean;
  outside: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  onAction: (action: RowAction) => void;
}) {
  const t = useTranslations('guests');
  const count = amountDisplay(guest);
  const invited = count.invited;
  // Flagged only while it is the Guest's own answer: an Owner override is theirs.
  const above =
    count.changedByGuest && count.value > invited ? count.value - invited : 0;
  const side = guest.side ?? guest.group?.side ?? null;
  const meals = Object.entries(guest.mealCounts ?? {}).filter(
    ([, n]) => (n ?? 0) > 0,
  ) as [MealChoice, number][];
  const presentation = rsvpPresentation(guest.rsvpStatus);

  return (
    <div
      role="row"
      aria-selected={checked}
      onClick={onOpen}
      style={{
        transform: `translateY(${top}px)`,
        height: ROW_HEIGHT,
      }}
      className={cn(
        'group/row absolute inset-x-0 top-0 grid cursor-pointer items-center border-b text-[13.5px] transition-colors',
        GRID,
        checked ? 'bg-primary/6' : 'hover:bg-muted/60',
        flash && 'row-updated',
      )}
    >
      <span className="h-full">
        <SelectBox
          state={checked ? 'all' : 'none'}
          label={t('list.columns.selectRow', { name: guest.name })}
          onClick={onToggle}
        />
      </span>

      <div className="flex min-w-0 items-center gap-2.5 pe-3">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold',
            avatarTintFor(guest.name),
          )}
        >
          {guest.name.charAt(0)}
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-bold">{guest.name}</span>
            {outside && <OutsidePackageTag size="md" />}
          </span>
          {guest.notes && (
            <span className="text-muted-foreground truncate text-[11.5px]">
              {guest.notes}
            </span>
          )}
        </div>
      </div>

      <span className={cn('truncate text-[13px]', MID_UP)}>
        {guest.phone ? (
          <bdi dir="ltr" className="text-muted-foreground">
            {formatPhone(guest.phone)}
          </bdi>
        ) : (
          <span className="text-destructive/75">{t('list.noPhone')}</span>
        )}
      </span>

      <span
        className={cn(
          'flex min-w-0 items-center gap-[7px] pe-2.5 text-[13px]',
          MID_UP,
          guest.group ? 'text-muted-foreground' : 'text-muted-foreground/70',
        )}
      >
        <span className="truncate">
          {guest.group?.name ?? t('list.noGroup')}
        </span>
        {guest.group && <SideBadge side={side} />}
      </span>

      <span className="flex items-center gap-[5px]">
        <span
          className={cn(
            'inline-flex h-[22px] items-center gap-[5px] rounded-full px-[9px] text-xs font-bold',
            presentation.chip,
          )}
        >
          <span className={cn('size-1.5 rounded-full', presentation.solid)} />
          {t(`list.status.${guest.rsvpStatus}`)}
        </span>
        {above > 0 && (
          <span
            title={t('list.aboveInvitedHint', { invited })}
            className="bg-violet-tint text-violet-strong inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-bold"
          >
            +{above}
          </span>
        )}
      </span>

      <span className="flex items-center">
        {count.changedByGuest ? (
          <AmountBadge count={count} />
        ) : (
          <span className="text-muted-foreground text-[13px] tabular-nums">
            {count.value}
          </span>
        )}
      </span>

      <span
        className={cn(
          'text-muted-foreground text-[13px] font-semibold tabular-nums',
          WIDE_ONLY,
        )}
      >
        {tableNumber ?? ''}
      </span>

      {showMeals && (
        <span
          className={cn(
            'text-muted-foreground flex min-w-0 items-center gap-[5px] text-[12.5px]',
            WIDE_ONLY,
          )}
        >
          {meals.length > 0 && (
            <>
              <span className="truncate">
                {t(`dietary.${MEAL_LABEL_KEY[meals[0][0]]}`)}
                {meals[0][1] > 1 ? ` ×${meals[0][1]}` : ''}
              </span>
              {meals.length > 1 && (
                <span className="bg-muted inline-flex h-[18px] shrink-0 items-center rounded-[5px] px-[5px] text-[11px] font-bold">
                  +{meals.length - 1}
                </span>
              )}
            </>
          )}
        </span>
      )}

      <span className="flex justify-center">
        <GuestRowMenu guest={guest} groups={groups} onAction={onAction} />
      </span>
    </div>
  );
}
