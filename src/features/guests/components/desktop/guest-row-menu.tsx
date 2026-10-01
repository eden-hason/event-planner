'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  IconCircleCheck,
  IconDots,
  IconEye,
  IconFolder,
  IconFolderOff,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  GroupWithGuestsApp,
  GuestWithGroupApp,
} from '@/features/guests/schemas';
import { cn } from '@/lib/utils';
import { SideBadge } from './side-badge';

export type RowAction =
  | { type: 'rsvp'; status: 'confirmed' | 'declined' }
  | { type: 'group'; groupId: string | null }
  | { type: 'open' }
  | { type: 'delete' };

/**
 * One row's ⋯ menu. The same actions the selection bar offers, scaled to one
 * record, so a single change and a bulk change behave the same way.
 */
export function GuestRowMenu({
  guest,
  groups,
  onAction,
}: {
  guest: GuestWithGroupApp;
  groups: GroupWithGuestsApp[];
  onAction: (action: RowAction) => void;
}) {
  const t = useTranslations('guests.list.rowMenu');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('trigger', { name: guest.name })}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'text-muted-foreground flex size-7 items-center justify-center rounded-[7px] outline-none',
            'data-[state=open]:bg-muted opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(pointer:coarse)]:opacity-100',
            'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          )}
        >
          <IconDots size={17} stroke={2.4} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[220px] rounded-xl p-[5px]"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem
          disabled={guest.rsvpStatus === 'confirmed'}
          onClick={() => onAction({ type: 'rsvp', status: 'confirmed' })}
          className="h-[34px] gap-[9px] text-[13.5px]"
        >
          <IconCircleCheck size={16} />
          {t('markConfirmed')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={guest.rsvpStatus === 'declined'}
          onClick={() => onAction({ type: 'rsvp', status: 'declined' })}
          className="h-[34px] gap-[9px] text-[13.5px]"
        >
          <IconX size={16} />
          {t('markDeclined')}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="h-[34px] gap-[9px] text-[13.5px]">
            <IconFolder size={16} />
            {t('moveToGroup')}
          </DropdownMenuSubTrigger>
          {/* The trigger sits inside the menu's 5px padding and 1px border, so
              the panel is pushed past the menu's edge rather than the trigger's. */}
          <DropdownMenuSubContent
            sideOffset={10}
            alignOffset={-6}
            className="max-h-72 w-56 overflow-y-auto"
          >
            {groups.length === 0 && !guest.groupId && (
              <div className="text-muted-foreground flex flex-col items-center gap-1.5 px-3 py-4 text-center text-[13px]">
                <IconFolder size={20} stroke={1.8} />
                {t('noGroups')}
              </div>
            )}
            {groups.map((group) => (
              <DropdownMenuItem
                key={group.id}
                disabled={guest.groupId === group.id}
                onClick={() => onAction({ type: 'group', groupId: group.id })}
                className="gap-2"
              >
                <span className="truncate">{group.name}</span>
                <SideBadge side={group.side} />
              </DropdownMenuItem>
            ))}
            {guest.groupId && (
              <>
                {groups.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => onAction({ type: 'group', groupId: null })}
                  className="gap-2"
                >
                  <IconFolderOff size={16} />
                  {t('removeFromGroup')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onClick={() => onAction({ type: 'open' })}
          className="h-[34px] gap-[9px] text-[13.5px]"
        >
          <IconEye size={16} />
          {t('open')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onAction({ type: 'delete' })}
          className="h-[34px] gap-[9px] text-[13.5px]"
        >
          <IconTrash size={16} />
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
