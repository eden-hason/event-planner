'use client';

import { useLocale } from 'next-intl';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSeatingCopy } from './use-seating-copy';

interface SeatingHeaderActionsProps {
  onAddTable: () => void;
  onAddBatch: () => void;
  /** Mobile has no room for labels, so the trigger collapses to an icon. */
  compact?: boolean;
}

/**
 * The header action.
 *
 * Creating one Table and creating a room full of them are the same intent seen
 * from two distances, so they share a single primary control.
 */
export function SeatingHeaderActions({
  onAddTable,
  onAddBatch,
  compact = false,
}: SeatingHeaderActionsProps) {
  const { t } = useSeatingCopy();
  // Radix menus write an explicit `dir`, defaulting to `ltr` without a
  // DirectionProvider - hand them the locale's direction so the menu opens and
  // aligns correctly in Hebrew.
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';

  return (
    <div className="flex gap-2">
      <DropdownMenu dir={dir}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size={compact ? 'icon' : 'default'}
            aria-label={compact ? t('addTablesMenu') : undefined}
          >
            <Plus className="size-4" />
            {!compact && (
              <>
                {t('addTablesMenu')}
                <ChevronDown className="size-4 opacity-70" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onAddTable}>
            {t('addTable')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddBatch}>
            {t('addTablesBatch')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
