'use client';

import { useTranslations } from 'next-intl';
import {
  IconDots,
  IconTrash,
  IconUserEdit,
  IconUsers,
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { cn } from '@/lib/utils';
import { GroupIcon } from '../group-icon';
import { SideBadge, sideTintClass } from '../../side-badge';

/** One group in the side list: click to open it, ⋯ for its actions. */
export function GroupListItem({
  group,
  selected,
  onSelect,
  onEdit,
  onShowInGuests,
  onDelete,
}: {
  group: GroupWithGuestsApp;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onShowInGuests: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('guests.groups');
  const sub =
    group.description ||
    (group.guestCount > 0 ? t('mobile.noDescription') : t('mobile.stillEmpty'));

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected || undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'flex h-[62px] shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border ps-1.5 pe-2.5 transition-colors',
        selected
          ? 'border-primary bg-primary/8'
          : 'bg-card hover:bg-accent/40',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
          sideTintClass(group.side),
        )}
      >
        <GroupIcon iconName={group.icon} size="md" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[14.5px] font-bold">{group.name}</span>
          <SideBadge side={group.side} />
        </div>
        <span
          className={cn(
            'truncate text-xs',
            group.description
              ? 'text-muted-foreground'
              : 'text-muted-foreground/70',
          )}
        >
          {sub}
        </span>
      </div>
      <span className="shrink-0 text-[15px] font-extrabold tabular-nums">
        {group.guestCount}
      </span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('openMenu')}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:bg-muted data-[state=open]:bg-muted flex h-[34px] w-[30px] shrink-0 items-center justify-center rounded-lg"
          >
            <IconDots size={17} stroke={2.4} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[236px] rounded-xl p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem onSelect={onEdit} className="h-10 gap-2.5 text-sm">
            <IconUserEdit size={17} />
            {t('mobile.menuEdit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onShowInGuests}
            className="h-10 gap-2.5 text-sm"
          >
            <IconUsers size={17} />
            {t('desktop.showInGuests')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={onDelete}
            className="h-10 gap-2.5 text-sm"
          >
            <IconTrash size={17} />
            {t('mobile.menuDelete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
