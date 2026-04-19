'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { GROUP_SIDES, GroupSide } from '@/features/guests/schemas';

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
  const t = useTranslations('guests');

  const sideLabel = (side: GroupSide) =>
    t(`sides.${side}` as 'sides.bride' | 'sides.groom');

  const getButtonLabel = () => {
    if (selectedSides.length === 0) return t('filters.filterBySide');
    if (selectedSides.length === 1) return sideLabel(selectedSides[0]);
    return t('filters.sidesSelected', { count: selectedSides.length });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[180px] justify-between bg-white"
        >
          {getButtonLabel()}
          <IconChevronDown size={16} className="ml-2 shrink-0 opacity-50" />
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
                    <IconCheck size={16} className="shrink-0" />
                  ) : (
                    <div className="h-4 w-4 shrink-0" />
                  )}
                  <span>{sideLabel(side)}</span>
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
