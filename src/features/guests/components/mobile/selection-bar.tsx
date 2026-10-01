'use client';

import { useTranslations } from 'next-intl';
import {
  IconCircleCheck,
  IconDownload,
  IconFolder,
  IconHeart,
  IconTrash,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export type SelectionAction = 'rsvp' | 'group' | 'side' | 'export' | 'delete';

const ACTIONS = [
  { key: 'rsvp', icon: IconCircleCheck },
  { key: 'group', icon: IconFolder },
  { key: 'side', icon: IconHeart },
  { key: 'export', icon: IconDownload },
  { key: 'delete', icon: IconTrash },
] as const;

/**
 * Takes the bottom nav's place while selecting (Guests Mobile design): the
 * same five actions as the desktop selection bar, each opening its own sheet.
 * The action whose sheet is open stays lit.
 */
export function SelectionBar({
  disabled,
  active,
  onAction,
}: {
  /** Nothing selected yet - the bar is there, but has nothing to act on. */
  disabled: boolean;
  active: SelectionAction | null;
  onAction: (action: SelectionAction) => void;
}) {
  const t = useTranslations('guests.list.bar');

  return (
    <div
      role="toolbar"
      className="bg-card animate-in slide-in-from-bottom-4 fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(26,11,46,0.08)] duration-200"
    >
      {ACTIONS.map(({ key, icon: Icon }) => {
        const destructive = key === 'delete';
        const on = active === key;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onAction(key)}
            className={cn(
              'flex h-[62px] flex-1 flex-col items-center justify-center gap-[3px] text-[11.5px] font-semibold disabled:opacity-40',
              destructive
                ? 'text-destructive'
                : on
                  ? 'text-primary'
                  : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-[30px] w-11 items-center justify-center rounded-[10px]',
                on && (destructive ? 'bg-destructive/10' : 'bg-primary/10'),
              )}
            >
              <Icon size={21} stroke={1.9} />
            </span>
            {t(key)}
          </button>
        );
      })}
    </div>
  );
}
