'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Check } from 'lucide-react';

interface GroupFilterProps {
  groups: string[];
  selectedGroups: string[];
  onGroupToggle: (group: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
}

export function GroupFilter({
  groups,
  selectedGroups,
  onGroupToggle,
  onSelectAll,
  isAllSelected,
}: GroupFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          {selectedGroups.length === 0
            ? 'Filter by group'
            : selectedGroups.length === 1
              ? selectedGroups[0]
              : `${selectedGroups.length} groups selected`}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2">
          <div className="max-h-[300px] overflow-y-auto">
            {groups.map((group) => {
              const isSelected = selectedGroups.includes(group);
              return (
                <div
                  key={group}
                  onClick={() => onGroupToggle(group)}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm p-2 text-sm transition-colors"
                >
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 shrink-0" />
                  )}
                  <span>{group}</span>
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
