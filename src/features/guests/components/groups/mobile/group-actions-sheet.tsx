'use client';

import { useTranslations } from 'next-intl';
import {
  IconTrash,
  IconUserEdit,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { GroupIcon } from '../group-icon';
import { cn } from '@/lib/utils';

interface GroupActionsSheetProps {
  group: GroupWithGuestsApp | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (group: GroupWithGuestsApp) => void;
  onAssign: (group: GroupWithGuestsApp) => void;
  onDelete: (group: GroupWithGuestsApp) => void;
}

/** The group card's ⋯ menu: a bottom sheet, one row per action. */
export function GroupActionsSheet({
  group,
  onOpenChange,
  onEdit,
  onAssign,
  onDelete,
}: GroupActionsSheetProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');

  const options = group
    ? [
        {
          key: 'edit',
          label: t('groups.mobile.menuEdit'),
          icon: IconUserEdit,
          run: () => onEdit(group),
        },
        {
          key: 'assign',
          label: t('groups.mobile.menuAssign'),
          icon: IconUserPlus,
          run: () => onAssign(group),
        },
        {
          key: 'delete',
          label: t('groups.mobile.menuDelete'),
          icon: IconTrash,
          run: () => onDelete(group),
          destructive: true,
        },
      ]
    : [];

  const subtitle = group
    ? group.side
      ? t('groups.mobile.menuSubtitle', {
          side: t(`list.sides.${group.side}`),
          count: group.guestCount,
        })
      : t('groups.mobile.menuSubtitleNoSide', { count: group.guestCount })
    : '';

  return (
    <Sheet open={group !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col gap-3.5 rounded-t-[24px] border-0 px-4 pt-5 pb-7 [&_[data-slot=sheet-close]]:hidden"
      >
        <SheetHeader className="flex-row items-center gap-3 p-0">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-[11px]',
              group?.side === 'bride' && 'bg-primary/10 text-primary',
              group?.side === 'groom' && 'bg-violet-tint text-violet-strong',
              !group?.side && 'bg-muted text-muted-foreground',
            )}
          >
            <GroupIcon iconName={group?.icon} size="md" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle className="truncate text-[18px] font-extrabold">
              {group?.name ?? ''}
            </SheetTitle>
            <span className="text-muted-foreground text-[13px]">
              {subtitle}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={tCommon('close')}
            className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
          >
            <IconX size={16} />
          </button>
        </SheetHeader>
        <div className="flex flex-col">
          {options.map(({ key, label, icon: Icon, run, destructive }) => (
            <button
              key={key}
              type="button"
              onClick={run}
              className={cn(
                'flex min-h-[50px] items-center gap-3 text-start',
                destructive ? 'text-destructive border-t' : 'text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-[34px] shrink-0 items-center justify-center rounded-[10px]',
                  destructive ? 'bg-destructive/10' : 'bg-muted',
                )}
              >
                <Icon size={18} />
              </span>
              <span className="flex-1 text-[15px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
