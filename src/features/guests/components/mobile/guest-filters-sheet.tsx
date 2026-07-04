'use client';

import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { IconCheck, IconPhoneOff } from '@tabler/icons-react';
import {
  GroupInfo,
  GroupSide,
  GROUP_SIDES,
} from '@/features/guests/schemas';
import { GuestSortKey } from '@/features/guests/hooks';
import { cn } from '@/lib/utils';

const SORT_KEYS: GuestSortKey[] = [
  'name_asc',
  'name_desc',
  'created_asc',
  'created_desc',
  'rsvp',
  'amount_desc',
];

interface GuestFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupInfo[];
  selectedGroupIds: string[];
  onGroupToggle: (groupId: string) => void;
  selectedSides: GroupSide[];
  onSideToggle: (side: GroupSide) => void;
  noPhoneOnly: boolean;
  onToggleNoPhone: () => void;
  sortKey: GuestSortKey;
  onSortChange: (key: GuestSortKey) => void;
  onClearAll: () => void;
}

export function GuestFiltersSheet({
  open,
  onOpenChange,
  groups,
  selectedGroupIds,
  onGroupToggle,
  selectedSides,
  onSideToggle,
  noPhoneOnly,
  onToggleNoPhone,
  sortKey,
  onSortChange,
  onClearAll,
}: GuestFiltersSheetProps) {
  const t = useTranslations('guests');

  const sideLabel = (side: GroupSide) =>
    t(`sides.${side}` as 'sides.bride' | 'sides.groom');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[85dvh] flex-col gap-0 rounded-t-xl p-0"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{t('filters.title')}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Sort */}
          <section className="mb-6">
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              {t('filters.sortBy')}
            </h3>
            <div className="flex flex-col gap-1">
              {SORT_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSortChange(key)}
                  className="hover:bg-accent flex min-h-11 items-center gap-2 rounded-md px-2 text-sm transition-colors"
                >
                  <IconCheck
                    size={16}
                    className={cn('shrink-0', sortKey === key ? 'opacity-100' : 'opacity-0')}
                  />
                  {t(`sort.${key}`)}
                </button>
              ))}
            </div>
          </section>

          {/* Group */}
          {groups.length > 0 && (
            <section className="mb-6">
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
                {t('filters.filterByGroup')}
              </h3>
              <div className="flex flex-col gap-1">
                {groups.map((group) => {
                  const isSelected = selectedGroupIds.includes(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => onGroupToggle(group.id)}
                      className="hover:bg-accent flex min-h-11 items-center gap-2 rounded-md px-2 text-sm transition-colors"
                    >
                      <IconCheck
                        size={16}
                        className={cn('shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
                      />
                      {group.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Side */}
          <section className="mb-6">
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              {t('filters.filterBySide')}
            </h3>
            <div className="flex flex-col gap-1">
              {GROUP_SIDES.map((side) => {
                const isSelected = selectedSides.includes(side);
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => onSideToggle(side)}
                    className="hover:bg-accent flex min-h-11 items-center gap-2 rounded-md px-2 text-sm transition-colors"
                  >
                    <IconCheck
                      size={16}
                      className={cn('shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
                    />
                    {sideLabel(side)}
                  </button>
                );
              })}
            </div>
          </section>

          {/* No phone */}
          <section>
            <button
              type="button"
              onClick={onToggleNoPhone}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
                noPhoneOnly
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border hover:bg-accent',
              )}
            >
              <IconPhoneOff size={16} />
              {t('filters.noPhone')}
            </button>
          </section>
        </div>

        <SheetFooter className="flex-row justify-between border-t px-5 py-4">
          <Button variant="ghost" onClick={onClearAll}>
            {t('filters.clearAll')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{t('filters.apply')}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
