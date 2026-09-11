'use client';

import { useTranslations, useLocale } from 'next-intl';
import { IconDotsVertical, IconTrash } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { GroupIcon } from '../group-icon';
import { cn } from '@/lib/utils';

interface GroupMobileCardProps {
  group: GroupWithGuestsApp;
  onSelect: () => void;
  onDelete: () => void;
}

// Same side -> tint mapping as the desktop GroupCard, so a group reads the
// same color whichever surface it's viewed from.
const SIDE_TINT: Record<'bride' | 'groom', string> = {
  bride: 'bg-primary/10 text-primary',
  groom: 'bg-blue-100 text-blue-600',
};

export function GroupMobileCard({ group, onSelect, onDelete }: GroupMobileCardProps) {
  const t = useTranslations('guests');
  const isRTL = useLocale() === 'he';
  const tint = group.side ? SIDE_TINT[group.side] : 'bg-muted text-muted-foreground';
  const sub =
    group.description ||
    (group.guestCount > 0 ? t('groups.mobile.noDescription') : t('groups.mobile.stillEmpty'));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="bg-card flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40"
    >
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-[11px]', tint)}>
        <GroupIcon iconName={group.icon} size="md" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold">{group.name}</span>
          {group.side && (
            <Badge className={cn('shrink-0 rounded-[5px] px-1.5 py-0 text-[10px] font-semibold', tint)}>
              {t(`sides.${group.side}` as 'sides.bride' | 'sides.groom')}
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground truncate text-xs">{sub}</span>
      </div>

      <div className="flex shrink-0 flex-col items-center">
        <span className="text-[17px] leading-none font-bold">{group.guestCount}</span>
        <span className="text-muted-foreground text-[10px]">{t('groups.mobile.guestsLabel')}</span>
      </div>

      <DropdownMenu dir={isRTL ? 'rtl' : 'ltr'}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">{t('groups.openMenu')}</span>
            <IconDotsVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11 gap-3 text-base [&_svg:not([class*='size-'])]:size-5"
            onClick={onDelete}
          >
            <IconTrash size={20} />
            {t('groups.deleteGroup')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
