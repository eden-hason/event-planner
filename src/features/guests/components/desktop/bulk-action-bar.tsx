'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconChevronDown,
  IconCircleCheck,
  IconDownload,
  IconFolder,
  IconFolderOff,
  IconHeart,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GroupSide, GroupWithGuestsApp } from '@/features/guests/schemas';
import {
  rsvpPresentation,
  RSVP_STATUSES,
  type RsvpStatus,
} from '@/features/guests/utils';
import { cn } from '@/lib/utils';
import { sideDotClass } from './side-dot';

export type BulkAction =
  | { type: 'rsvp'; status: RsvpStatus }
  | { type: 'group'; groupId: string | null }
  | { type: 'newGroup' }
  | { type: 'side'; side: GroupSide | null }
  | { type: 'export' }
  | { type: 'delete' };

const RSVP_LABEL: Record<RsvpStatus, string> = {
  confirmed: 'markConfirmed',
  pending: 'markPending',
  declined: 'markDeclined',
};

/**
 * The floating bar a selection brings up, pinned to the bottom of the viewport
 * over the list. The toolbar stays usable underneath it, so the Owner can keep
 * searching and filtering while the selection builds.
 */
export function BulkActionBar({
  count,
  hidden,
  groups,
  onClear,
  onShowHidden,
  onAction,
}: {
  count: number;
  hidden: number;
  groups: GroupWithGuestsApp[];
  onClear: () => void;
  onShowHidden: () => void;
  onAction: (action: BulkAction) => void;
}) {
  const t = useTranslations('guests.list');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';

  return (
    <div
      role="toolbar"
      aria-label={t('bar.selected', { count })}
      className={cn(
        'bg-foreground text-background pointer-events-auto flex h-[52px] items-center gap-1 rounded-[14px] px-2 whitespace-nowrap',
        'animate-in fade-in slide-in-from-bottom-3 shadow-[0_16px_40px_rgba(26,11,46,0.3)] duration-200',
      )}
    >
      <BarButton
        aria-label={t('bar.clear')}
        onClick={onClear}
        className="w-9 justify-center px-0"
      >
        <IconX size={17} stroke={2.2} />
      </BarButton>
      <span className="px-1 text-sm font-bold tabular-nums">
        {t('bar.selected', { count })}
      </span>
      {hidden > 0 && (
        <>
          <span className="text-background/60 text-[13.5px]">·</span>
          <button
            type="button"
            onClick={onShowHidden}
            className="text-background/70 hover:text-background px-1 text-[13.5px] underline underline-offset-[3px]"
          >
            {t('bar.hidden', { count: hidden })}
          </button>
        </>
      )}
      <Divider />

      <DropdownMenu dir={dir}>
        <DropdownMenuTrigger asChild>
          <BarButton>
            <IconCircleCheck size={16} />
            {t('bar.rsvp')}
            <IconChevronDown size={13} />
          </BarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" sideOffset={10}>
          {RSVP_STATUSES.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => onAction({ type: 'rsvp', status })}
              className="gap-2"
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  rsvpPresentation(status).solid,
                )}
              />
              {t(`bar.${RSVP_LABEL[status]}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu dir={dir}>
        <DropdownMenuTrigger asChild>
          <BarButton>
            <IconFolder size={16} />
            {t('bar.group')}
            <IconChevronDown size={13} />
          </BarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          sideOffset={10}
          className="max-h-80 w-60 overflow-y-auto"
        >
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              onClick={() => onAction({ type: 'group', groupId: group.id })}
              className="gap-2"
            >
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  sideDotClass(group.side),
                )}
              />
              <span className="truncate">{group.name}</span>
            </DropdownMenuItem>
          ))}
          {groups.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={() => onAction({ type: 'newGroup' })}
            className="gap-2"
          >
            <IconPlus size={16} />
            {t('bar.newGroup')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAction({ type: 'group', groupId: null })}
            className="gap-2"
          >
            <IconFolderOff size={16} />
            {t('rowMenu.removeFromGroup')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu dir={dir}>
        <DropdownMenuTrigger asChild>
          <BarButton>
            <IconHeart size={16} />
            {t('bar.side')}
            <IconChevronDown size={13} />
          </BarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" sideOffset={10}>
          {(['bride', 'groom', null] as (GroupSide | null)[]).map((side) => (
            <DropdownMenuItem
              key={side ?? 'none'}
              onClick={() => onAction({ type: 'side', side })}
              className="gap-2"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  side ? sideDotClass(side) : 'bg-muted-foreground/40',
                )}
              />
              {t(`sides.${side ?? 'none'}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <BarButton onClick={() => onAction({ type: 'export' })}>
        <IconDownload size={16} />
        {t('bar.export')}
      </BarButton>

      <Divider />
      <button
        type="button"
        onClick={() => onAction({ type: 'delete' })}
        className="bg-destructive hover:bg-destructive/90 flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[13.5px] font-bold text-white"
      >
        <IconTrash size={16} />
        {t('bar.delete')}
      </button>
    </div>
  );
}

function Divider() {
  return <span className="bg-background/20 mx-2 h-[26px] w-px" />;
}

function BarButton({
  children,
  className,
  ...props
}: React.ComponentProps<'button'> & { children: ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'hover:bg-background/12 data-[state=open]:bg-background/12 flex h-9 items-center gap-1.5 rounded-[9px] px-[11px] text-[13.5px] font-semibold outline-none',
        'focus-visible:ring-background/40 focus-visible:ring-2',
        className,
      )}
    >
      {children}
    </button>
  );
}
