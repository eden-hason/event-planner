'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { GroupInfo } from '@/features/guests/schemas';
import { cn } from '@/lib/utils';

interface GroupFilterProps {
  groups: GroupInfo[];
  selectedGroupIds: string[];
  onGroupToggle: (groupId: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
}

export function GroupFilter({
  groups,
  selectedGroupIds,
  onGroupToggle,
  onSelectAll,
  isAllSelected,
}: GroupFilterProps) {
  const t = useTranslations('guests');

  const selectedGroupNames = groups
    .filter((g) => selectedGroupIds.includes(g.id))
    .map((g) => g.name);

  const isActive = selectedGroupIds.length > 0;

  const label = !isActive
    ? t('filters.filterByGroup')
    : selectedGroupIds.length === 1
      ? selectedGroupNames[0]
      : t('filters.groupsSelected', { count: selectedGroupIds.length });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[180px] justify-between',
            isActive && 'border-primary/50 bg-primary/8 text-primary font-medium hover:bg-primary/15 hover:text-primary',
          )}
        >
          {label}
          <IconChevronDown
            size={16}
            className={cn('ml-2 shrink-0', isActive ? 'opacity-70' : 'opacity-50')}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2">
          <div className="max-h-[300px] overflow-y-auto">
            {groups.map((group) => {
              const isSelected = selectedGroupIds.includes(group.id);
              return (
                <div
                  key={group.id}
                  onClick={() => onGroupToggle(group.id)}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm p-2 text-sm transition-colors"
                >
                  {isSelected ? (
                    <IconCheck size={16} className="shrink-0" />
                  ) : (
                    <div className="h-4 w-4 shrink-0" />
                  )}
                  <span>{group.name}</span>
                </div>
              );
            })}
          </div>
          <div
            onClick={onSelectAll}
            className="hover:bg-accent mt-1 flex cursor-pointer items-center gap-2 rounded-sm p-2 text-sm font-medium transition-colors"
          >
            {isAllSelected ? (
              <IconCheck size={16} className="shrink-0" />
            ) : (
              <div className="h-4 w-4 shrink-0" />
            )}
            <span>{t('filters.selectAll')}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
