'use client';

import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconCheck,
  IconChevronRight,
  IconClock,
  IconUserCheck,
  IconUserX,
  type Icon,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import { rsvpPresentation, type RsvpStatus } from '@/features/guests/utils';
import { amountDisplay } from '@/features/guests/utils/guest-amount';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { OutsidePackageTag } from '../package';

/**
 * Fixed row height: the list is virtualized, so rows must never grow. Set
 * inline in px so it stays in step with the virtualizer when `--ui-scale`
 * shrinks everything else.
 */
export const CARD_HEIGHT = 64;

/**
 * The checkbox column, sliding open while selecting and shut after. The
 * negative end margin takes back the row's gap while it is shut, so nothing
 * sits indented by an empty column.
 */
export const checkboxSlotClass = (shown: boolean) =>
  cn(
    'flex h-10 shrink-0 items-center justify-center overflow-hidden transition-[width,opacity,margin] duration-200 ease-out motion-reduce:transition-none',
    shown ? 'w-10 opacity-100' : '-me-2.5 w-0 opacity-0',
  );

/** Each answer's mark, as a Schedule's Results draws it. */
const STATUS_ICON: Record<RsvpStatus, Icon> = {
  confirmed: IconUserCheck,
  pending: IconClock,
  declined: IconUserX,
};

/**
 * One Guest Record in the phone's list card, on shadcn's Item, drawn like a
 * guest on a Schedule's Results: the answer as the media - with how many are
 * coming on it - then who and how to reach them, and the group with a chevron
 * that says the row opens. While selecting, a checkbox slides in and the whole
 * row toggles the record instead.
 */
export function GuestMobileCard({
  guest,
  selecting,
  checked,
  tableNumber,
  outside = false,
  style,
  onOpen,
  onToggle,
}: {
  guest: GuestWithGroupApp;
  /** The list is selecting: the row is a checkbox, not a way into the record. */
  selecting: boolean;
  checked: boolean;
  tableNumber: number | undefined;
  /** Outside the Record Package: tagged beside the name, so the row keeps its height. */
  outside?: boolean;
  style?: CSSProperties;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const t = useTranslations('guests');
  const status = guest.rsvpStatus;
  const presentation = rsvpPresentation(status);
  const StatusIcon = STATUS_ICON[status];
  // Only a confirmed record has a count of its own; elsewhere it is the invitation's.
  const coming =
    status === 'confirmed' ? amountDisplay(guest).value : undefined;
  const statusLabel = [t(`list.status.${status}`), coming]
    .filter(Boolean)
    .join(' ');
  // The table, once there is one; an unseated record says nothing about it.
  const seat =
    tableNumber !== undefined
      ? t('form.table.tableNumber', { number: tableNumber })
      : null;

  const activate = selecting ? onToggle : onOpen;

  return (
    <Item
      // While selecting the row itself is the checkbox; the box in it is drawn only.
      role={selecting ? 'checkbox' : 'button'}
      aria-checked={selecting ? checked : undefined}
      tabIndex={0}
      size="xs"
      style={{ height: CARD_HEIGHT, ...style }}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activate();
      }}
      className={cn(
        // A hairline between rows: Item's own border is transparent on every side.
        'border-border cursor-pointer flex-nowrap gap-2.5 rounded-none border-x-0 border-t border-b-0 py-0 pe-1.5 transition-[padding,background-color] duration-200 focus-visible:ring-inset motion-reduce:transition-none',
        selecting ? 'ps-1' : 'ps-3.5',
        checked && selecting ? 'bg-primary/6' : 'active:bg-muted/60',
      )}
    >
      <span aria-hidden className={checkboxSlotClass(selecting)}>
        <span
          className={cn(
            'flex size-5 items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/45 bg-card',
          )}
        >
          {checked && <IconCheck size={14} stroke={3} />}
        </span>
      </span>

      <ItemMedia
        role="img"
        aria-label={statusLabel}
        className={cn(
          // Centred in the fixed-height row, not raised to the description.
          'relative size-9 rounded-full border group-has-[[data-slot=item-description]]/item:translate-y-0 group-has-[[data-slot=item-description]]/item:self-center',
          presentation.activeSurface,
          presentation.text,
        )}
      >
        <StatusIcon size={18} aria-hidden />
        {!!coming && (
          <span className="border-card bg-rsvp-confirmed-strong absolute -end-[5px] -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 px-1 text-[11px] leading-none font-bold text-white tabular-nums">
            {coming}
          </span>
        )}
      </ItemMedia>

      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="w-full min-w-0 text-[15px] font-semibold">
          <span className="truncate">{guest.name}</span>
          {outside && <OutsidePackageTag />}
        </ItemTitle>
        <ItemDescription className="truncate text-[13px] leading-[18px]">
          {guest.phone ? (
            <bdi dir="ltr">{formatPhone(guest.phone)}</bdi>
          ) : (
            <span className="text-destructive/75">{t('list.noPhone')}</span>
          )}
          {seat && ` · ${seat}`}
        </ItemDescription>
      </ItemContent>

      <ItemActions className="gap-0.5">
        {guest.group && (
          <Badge
            variant="secondary"
            className="block max-w-[96px] truncate px-2 font-medium"
          >
            {guest.group.name}
          </Badge>
        )}
        {/* Selecting, a tap no longer opens the record, so the chevron fades. */}
        <span
          aria-hidden
          className={cn(
            'text-muted-foreground flex size-8 items-center justify-center transition-opacity duration-200 motion-reduce:transition-none',
            selecting && 'opacity-0',
          )}
        >
          <IconChevronRight size={16} className="rtl:rotate-180" />
        </span>
      </ItemActions>
    </Item>
  );
}
