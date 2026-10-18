'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TableView } from '../types';
import { useSeatingCopy } from './use-seating-copy';

interface DeleteTableDialogProps {
  view: TableView | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Deleting a Table returns its Guest Records to Unassigned; it never deletes a
 * Guest Record. The confirmation says so in as many words, and names both
 * counts - records and people - because they are different numbers and a
 * planner is about to undo work on the basis of them.
 */
export function DeleteTableDialog({
  view,
  onOpenChange,
  onConfirm,
}: DeleteTableDialogProps) {
  const { t, tableTitle } = useSeatingCopy();

  if (!view) return null;

  const tableName = tableTitle(view.table);

  const records = view.occupancy.records;

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('deleteDialog.title', { table: tableName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {records === 0
              ? t('deleteDialog.descriptionEmpty')
              : t('deleteDialog.description', {
                  records,
                  heads: view.seatedHeads,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {view.guests.length > 0 && (
          <div className="bg-muted/50 space-y-1.5 rounded-lg p-3">
            <p className="text-muted-foreground text-xs font-medium">
              {t('deleteDialog.returning')}
            </p>
            <p className="text-sm">
              {view.guests
                .map(
                  (guest) =>
                    `${guest.name} · ${guest.amount ?? 1}${
                      guest.rsvpStatus === 'pending' ? ` (${t('table.pending')})` : ''
                    }`,
                )
                .join('  ·  ')}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {t('deleteDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
