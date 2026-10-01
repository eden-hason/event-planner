'use client';

import { useTranslations } from 'next-intl';
import { IconDots } from '@tabler/icons-react';
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { GroupIcon } from '../group-icon';
import { cn } from '@/lib/utils';
import { SideBadge } from '../../desktop/side-badge';

interface GroupMobileCardProps {
  group: GroupWithGuestsApp;
  onSelect: () => void;
  onOpenMenu: () => void;
  menuOpen?: boolean;
}

// Same side -> tint mapping as the desktop GroupCard, so a group reads the
// same color whichever surface it's viewed from.
const SIDE_TINT: Record<'bride' | 'groom', string> = {
  bride: 'bg-primary/10 text-primary',
  groom: 'bg-violet-tint text-violet-strong',
};

export function GroupMobileCard({
  group,
  onSelect,
  onOpenMenu,
  menuOpen,
}: GroupMobileCardProps) {
  const t = useTranslations('guests');
  const tint = group.side
    ? SIDE_TINT[group.side]
    : 'bg-muted text-muted-foreground';
  const sub =
    group.description ||
    (group.guestCount > 0
      ? t('groups.mobile.noDescription')
      : t('groups.mobile.stillEmpty'));

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
      className="bg-card hover:bg-accent/40 flex h-[72px] cursor-pointer items-center gap-2.5 rounded-[14px] border ps-2 pe-1 transition-colors"
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-[11px]',
          tint,
        )}
      >
        <GroupIcon iconName={group.icon} size="md" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold">
            {group.name}
          </span>
          <SideBadge side={group.side} />
        </div>
        <span className="text-muted-foreground truncate text-[12.5px]">
          {sub}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-center">
        <span className="text-base leading-none font-extrabold tabular-nums">
          {group.guestCount}
        </span>
        <span className="text-muted-foreground text-[11px]">
          {t('groups.mobile.recordsLabel')}
        </span>
      </div>

      <button
        type="button"
        aria-label={t('groups.openMenu')}
        onClick={(e) => {
          e.stopPropagation();
          onOpenMenu();
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          'text-muted-foreground -ms-1 flex h-11 w-[30px] shrink-0 items-center justify-center rounded-[9px]',
          menuOpen && 'bg-muted',
        )}
      >
        <IconDots size={18} stroke={2.4} />
      </button>
    </div>
  );
}
