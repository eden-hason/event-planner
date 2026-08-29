'use client';

import { TriangleAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TableView } from '../types';
import { useSeatingCopy } from './use-seating-copy';

interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: TableView[];
  /** Records being seated - always seated together, never split. */
  guestNames: string[];
  partyHeads: number;
  error: string | null;
  onPick: (tableId: string) => void;
}

/**
 * The universal assignment interaction.
 *
 * Available on desktop, mobile, touch and keyboard alike; drag-and-drop is a
 * speed enhancement layered on top, never the only path. Tables without room
 * are shown but disabled with the exact shortfall, so a planner never sends a
 * request that has to fail.
 */
export function AssignDialog({
  open,
  onOpenChange,
  tables,
  guestNames,
  partyHeads,
  error,
  onPick,
}: AssignDialogProps) {
  const { t, tableTitle, fitLine } = useSeatingCopy();
  const isBulk = guestNames.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBulk
              ? t('assignDialog.titleBulk', { count: guestNames.length })
              : t('assignDialog.title', { name: guestNames[0] ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {isBulk ? t('assignDialog.descriptionBulk') : t('assignDialog.description')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="border-destructive/40 bg-destructive/5 flex items-start gap-2 rounded-lg border p-3">
            <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="-mx-1 max-h-72 space-y-1.5 overflow-y-auto px-1">
          {tables.map((view) => {
            const fits = partyHeads <= view.freeSeats;
            return (
              <button
                key={view.table.id}
                type="button"
                disabled={!fits}
                onClick={() => onPick(view.table.id)}
                className={cn(
                  'border-border flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-start transition-colors',
                  fits ? 'bg-card hover:bg-muted/60' : 'bg-muted/40 cursor-not-allowed opacity-55',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tableTitle(view.table)}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {fitLine(view, partyHeads)}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    fits
                      ? 'bg-rsvp-confirmed/16 text-rsvp-confirmed'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {fits
                    ? t('assignDialog.fits')
                    : t('assignDialog.short', { count: partyHeads - view.freeSeats })}
                </span>
              </button>
            );
          })}

          {tables.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {t('assignDialog.noTables')}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('assignDialog.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
