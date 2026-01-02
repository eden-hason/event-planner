'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Check } from 'lucide-react';
import {
  GROUP_SIDES,
  GROUP_SIDE_LABELS,
  GroupSide,
} from '@/features/guests/schemas';

interface SideFilterProps {
  selectedSides: GroupSide[];
  onSideToggle: (side: GroupSide) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
}

export function SideFilter({
  selectedSides,
  onSideToggle,
  onSelectAll,
  isAllSelected,
}: SideFilterProps) {
  const getButtonLabel = () => {
    if (selectedSides.length === 0) {
      return 'Filter by side';
    }
    if (selectedSides.length === 1) {
      return GROUP_SIDE_LABELS[selectedSides[0]];
    }
    return `${selectedSides.length} sides selected`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[180px] justify-between bg-white"
        >
          {getButtonLabel()}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2">
          <div className="max-h-[300px] overflow-y-auto">
            {GROUP_SIDES.map((side) => {
              const isSelected = selectedSides.includes(side);
              return (
                <div
                  key={side}
                  onClick={() => onSideToggle(side)}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm p-2 text-sm transition-colors"
                >
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 shrink-0" />
                  )}
                  <span>{GROUP_SIDE_LABELS[side]}</span>
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
