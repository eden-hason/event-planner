'use client';

import { useRef, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconCheck,
  IconDots,
  IconUser,
  IconUserEdit,
} from '@tabler/icons-react';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { amountDisplay } from '@/features/guests/utils/guest-amount';
import { avatarTintFor } from '@/lib/avatar-tint';
import { cn } from '@/lib/utils';

/** Fixed card height: the list is virtualized, so cards must never grow. */
export const CARD_HEIGHT = 72;
/** How long a press has to last to start a selection. */
const LONG_PRESS_MS = 450;

/**
 * One Guest Record on the phone list (Guests Mobile design): who and which
 * group, with the RSVP on the far side. A tap
 * opens the record; while selecting, it toggles it instead. A long press
 * starts a selection with this record in it.
 */
export function GuestMobileCard({
  guest,
  selecting,
  checked,
  style,
  onOpen,
  onToggle,
  onLongPress,
  onMenu,
}: {
  guest: GuestWithGroupApp;
  selecting: boolean;
  checked: boolean;
  style?: CSSProperties;
  onOpen: () => void;
  onToggle: () => void;
  onLongPress: () => void;
  onMenu: () => void;
}) {
  const t = useTranslations('guests.list');
  const count = amountDisplay(guest);
  const presentation = rsvpPresentation(guest.rsvpStatus);

  // A press that turns long starts the selection, and swallows the click that
  // follows it so the same touch does not also toggle the record back out.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const cancelPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <div
      role={selecting ? 'checkbox' : 'button'}
      aria-checked={selecting ? checked : undefined}
      tabIndex={0}
      style={style}
      onPointerDown={() => {
        fired.current = false;
        if (selecting) return;
        timer.current = setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      // Scrolling the list is not a press.
      onTouchMove={cancelPress}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        if (fired.current) return;
        if (selecting) onToggle();
        else onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (selecting) onToggle();
        else onOpen();
      }}
      className={cn(
        'focus-visible:ring-ring/50 flex h-[72px] cursor-pointer items-center gap-2.5 rounded-[14px] border ps-3 pe-1.5 outline-none transition-colors select-none focus-visible:ring-[3px] [-webkit-touch-callout:none]',
        checked && selecting
          ? 'bg-primary/6 border-primary/40 border-dashed'
          : 'bg-card active:bg-muted/60',
      )}
    >
      {selecting && (
        <span
          className={cn(
            'flex size-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px]',
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-card',
          )}
        >
          {checked && <IconCheck size={15} stroke={3} />}
        </span>
      )}

      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold',
          avatarTintFor(guest.name),
        )}
      >
        {guest.name.charAt(0)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate text-[15px] font-bold">{guest.name}</span>
        <span
          className={cn(
            'truncate text-[13px]',
            guest.group ? 'text-muted-foreground' : 'text-muted-foreground/70',
          )}
        >
          {guest.group?.name ?? t('noGroup')}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Every card shows its count; a pencil marks one the Guest changed
            in their own answer, so it reads apart from the invitation. */}
        <span
          title={
            count.changedByGuest
              ? t('amountChangedHint', {
                  invited: count.invited,
                  coming: count.value,
                })
              : undefined
          }
          className="inline-flex h-[18px] items-center gap-[3px] rounded-md bg-sky-100 px-[5px] text-[11px] font-bold text-sky-700 tabular-nums dark:bg-sky-400/15 dark:text-sky-300"
        >
          {count.changedByGuest ? (
            <IconUserEdit size={11} stroke={2.3} />
          ) : (
            <IconUser size={11} stroke={2.3} />
          )}
          {count.value}
        </span>
        <span
          className={cn(
            'inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11.5px] font-bold',
            presentation.chip,
          )}
        >
          <span className={cn('size-1.5 rounded-full', presentation.solid)} />
          {t(`status.${guest.rsvpStatus}`)}
        </span>
      </div>

      {!selecting && (
        <button
          type="button"
          aria-label={t('rowMenu.trigger', { name: guest.name })}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onMenu();
          }}
          className="text-muted-foreground -ms-1 flex h-11 w-[30px] shrink-0 items-center justify-center"
        >
          <IconDots size={18} stroke={2.4} />
        </button>
      )}
    </div>
  );
}
