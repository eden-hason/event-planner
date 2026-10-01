'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { GuestApp, GroupWithGuestsApp } from '@/features/guests/schemas';
import { updateGroupMembers } from '@/features/guests/actions/groups';
import { GroupIcon } from '../group-icon';
import { SideBadge, sideTintClass } from '../../side-badge';
import { cn } from '@/lib/utils';

interface PickGroupSheetProps {
  eventId: string;
  /** The guest record being assigned; the sheet is open while this is set. */
  guest: GuestApp | null;
  groups: GroupWithGuestsApp[];
  onOpenChange: (open: boolean) => void;
}

/**
 * Where the unassigned list's per-card "Assign" button lands: pick the one
 * group this record joins. Reuses `updateGroupMembers` with a single added id,
 * so no new server action.
 */
export function PickGroupSheet({
  eventId,
  guest,
  groups,
  onOpenChange,
}: PickGroupSheetProps) {
  const t = useTranslations('guests');
  const isRTL = useLocale() === 'he';
  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;

  const handlePick = (group: GroupWithGuestsApp) => {
    if (!guest) return;
    const name = guest.name;
    onOpenChange(false);

    const promise = updateGroupMembers(eventId, group.id, [guest.id], []).then(
      (result) => {
        if (!result.success) {
          throw new Error(result.message || t('groups.mobile.assignFailed'));
        }
        return result;
      },
    );

    toast.promise(promise, {
      loading: t('groups.assign.updatingMembers', { name: group.name }),
      success: () =>
        t('groups.mobile.assignedToast', { name, group: group.name }),
      error: (err) =>
        err instanceof Error ? err.message : t('groups.mobile.assignFailed'),
    });
  };

  return (
    <Sheet open={guest !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[70dvh] flex-col gap-0 overflow-clip rounded-t-xl border-0 p-0"
      >
        <SheetHeader className="border-b px-4 pt-5 pb-3">
          <SheetTitle className="text-[17px]">
            {t('groups.mobile.pickGroupTitle', { name: guest?.name ?? '' })}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1.5 overflow-y-auto p-3 pb-6">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => handlePick(group)}
              className="hover:bg-accent/60 flex h-14 items-center gap-3 rounded-xl border px-3 text-start"
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
                  sideTintClass(group.side),
                )}
              >
                <GroupIcon iconName={group.icon} size="md" />
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-[15px] font-bold">
                  {group.name}
                </span>
                <SideBadge side={group.side} />
              </span>
              <Chevron size={16} className="text-muted-foreground shrink-0" />
            </button>
          ))}
          {groups.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t('groups.mobile.pickGroupEmpty')}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
