'use client';

import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type {
  GroupWithGuestsApp,
  GuestWithGroupApp,
} from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { amountDisplay } from '@/features/guests/utils/guest-amount';
import { IconUserEdit } from '@tabler/icons-react';
import type { HeaderState } from '@/features/guests/utils/guest-selection';
import type { MealChoice } from '@/lib/meal-choices';
import { formatPhone } from '@/lib/phone';
import { avatarTintFor } from '@/lib/avatar-tint';
import { cn } from '@/lib/utils';
import { SelectBox } from './select-box';
import { sideDotClass } from './side-dot';
import { GuestRowMenu, type RowAction } from './guest-row-menu';

/** Fixed row height: the list is virtualized, so rows must never grow. */
const ROW_HEIGHT = 44;

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

  const grid = showMeals
    ? '44px minmax(0,1.7fr) 124px minmax(0,1.1fr) 150px 76px 56px minmax(0,1fr) 44px'
    : '44px minmax(0,1.9fr) 124px minmax(0,1.2fr) 150px 76px 56px 44px';

  return (
    <div className="bg-card rounded-t-xl border border-b-0">
      <div
        role="row"
        style={{ gridTemplateColumns: grid }}
        className="bg-card text-muted-foreground sticky top-[60px] z-10 grid h-[38px] items-center rounded-t-xl border-b text-xs font-semibold"
      >
        <span className="h-full">
          <SelectBox
            state={headerState}
            label={t('list.columns.selectAll')}
            onClick={onToggleAll}
          />
        </span>
        <span>{t('list.columns.name')}</span>
        <span>{t('list.columns.phone')}</span>
        <span>{t('list.columns.group')}</span>
        <span>{t('list.columns.rsvp')}</span>
        <span>{t('list.columns.amount')}</span>
        <span>{t('list.columns.table')}</span>
        {showMeals && <span>{t('list.columns.meals')}</span>}
        <span />
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
              grid={grid}
              top={item.start - virtualizer.options.scrollMargin}
              checked={selected.has(guest.id)}
              showMeals={showMeals}
              tableNumber={
                guest.tableId ? tableNumberById.get(guest.tableId) : undefined
              }
              flash={guest.id === recentlyUpdatedId}
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
  grid,
  top,
  checked,
  showMeals,
  tableNumber,
  flash,
  onToggle,
  onOpen,
  onAction,
}: {
  guest: GuestWithGroupApp;
  groups: GroupWithGuestsApp[];
  grid: string;
  top: number;
  checked: boolean;
  showMeals: boolean;
  tableNumber: number | undefined;
  flash: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  onAction: (action: RowAction) => void;
}) {
  const t = useTranslations('guests');
  const count = amountDisplay(guest);
  const invited = count.invited;
  const confirmed = guest.rsvpStatus === 'confirmed';
  const above =
    confirmed && guest.amount > invited ? guest.amount - invited : 0;
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
        gridTemplateColumns: grid,
        transform: `translateY(${top}px)`,
        height: ROW_HEIGHT,
      }}
      className={cn(
        'group/row absolute inset-x-0 top-0 grid cursor-pointer items-center border-b text-[13.5px] transition-colors',
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
          <span className="truncate font-bold">{guest.name}</span>
          {guest.notes && (
            <span className="text-muted-foreground truncate text-[11.5px]">
              {guest.notes}
            </span>
          )}
        </div>
      </div>

      <span className="truncate text-[13px]">
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
          guest.group ? 'text-muted-foreground' : 'text-muted-foreground/70',
        )}
      >
        <span
          className={cn('size-[7px] shrink-0 rounded-full', sideDotClass(side))}
        />
        <span className="truncate">
          {guest.group?.name ?? t('list.noGroup')}
        </span>
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
          <span
            title={t('list.amountChangedHint', {
              invited: count.invited,
              coming: count.value,
            })}
            className="inline-flex h-[22px] cursor-help items-center gap-[5px] rounded-[7px] bg-sky-100 ps-1.5 pe-[7px] text-[13px] font-bold text-sky-700 tabular-nums dark:bg-sky-400/15 dark:text-sky-300"
          >
            <IconUserEdit size={13} stroke={2.2} />
            {count.value}
          </span>
        ) : (
          <span className="text-muted-foreground text-[13px] tabular-nums">
            {count.value}
          </span>
        )}
      </span>

      <span className="text-muted-foreground text-[13px] font-semibold tabular-nums">
        {tableNumber ?? ''}
      </span>

      {showMeals && (
        <span className="text-muted-foreground flex min-w-0 items-center gap-[5px] text-[12.5px]">
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
