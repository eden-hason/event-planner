'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { IconPlus } from '@tabler/icons-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { cn } from '@/lib/utils';
import { GroupIcon } from '../group-icon';
import { SideBadge, sideTintClass } from '../../side-badge';

/**
 * "Assign to group" as a popover: every group, then "New group" at the foot.
 * Desktop's stand-in for the phone's pick-group sheet.
 */
export function GroupPicker({
  title,
  groups,
  open,
  onOpenChange,
  onPick,
  onNewGroup,
  children,
  align = 'end',
}: {
  title: string;
  groups: GroupWithGuestsApp[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (group: GroupWithGuestsApp) => void;
  onNewGroup: () => void;
  /** The trigger. */
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
}) {
  const t = useTranslations('guests.groups.mobile');

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="flex w-[290px] flex-col gap-1 rounded-xl p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-muted-foreground px-2 pt-1 pb-1.5 text-xs font-semibold">
          {title}
        </span>
        <div className="flex max-h-[280px] flex-col overflow-y-auto">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onPick(group)}
              className="hover:bg-muted flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-2 text-start"
            >
              <span
                className={cn(
                  'flex size-[26px] shrink-0 items-center justify-center rounded-[7px]',
                  sideTintClass(group.side),
                )}
              >
                <GroupIcon iconName={group.icon} size="sm" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {group.name}
              </span>
              <SideBadge side={group.side} />
            </button>
          ))}
          {groups.length === 0 && (
            <p className="text-muted-foreground px-2 py-3 text-sm">
              {t('pickGroupEmpty')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onNewGroup}
          className="text-primary hover:bg-muted mt-0.5 flex h-10 items-center gap-2.5 rounded-lg border-t px-2 text-sm font-bold"
        >
          <IconPlus size={16} stroke={2.4} />
          {t('newGroupButton')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
