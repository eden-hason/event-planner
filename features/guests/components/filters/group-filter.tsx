'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Check } from 'lucide-react';
import { GroupInfo } from '@/features/guests/schemas';

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
  // Find selected group names for display
  const selectedGroupNames = groups
    .filter((g) => selectedGroupIds.includes(g.id))
    .map((g) => g.name);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          {selectedGroupIds.length === 0
            ? 'Filter by group'
            : selectedGroupIds.length === 1
              ? selectedGroupNames[0]
              : `${selectedGroupIds.length} groups selected`}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                    <Check className="h-4 w-4 shrink-0" />
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
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <div className="h-4 w-4 shrink-0" />
            )}
            <span>Select All</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
