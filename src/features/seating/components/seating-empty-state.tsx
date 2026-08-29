'use client';

import { Button } from '@/components/ui/button';
import { useSeatingCopy } from './use-seating-copy';
import { TableSeatDiagram } from './table-seat-diagram';

interface SeatingEmptyStateProps {
  confirmedUnseated: number;
  onBatch: () => void;
  onSingle: () => void;
}

/**
 * No tables yet. Batch creation leads, because most couples set up the whole
 * room in one go and then adjust - and because doing it one table at a time
 * twelve times is the worst version of this task.
 */
export function SeatingEmptyState({
  confirmedUnseated,
  onBatch,
  onSingle,
}: SeatingEmptyStateProps) {
  const { t } = useSeatingCopy();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-muted-foreground/40 size-28">
        <TableSeatDiagram shape="round" capacity={10} confirmedHeads={0} pendingHeads={0} />
      </div>
      <h2 className="mt-6 text-lg font-semibold">{t('empty.title')}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">{t('empty.description')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={onBatch}>
          {t('empty.batch')}
        </Button>
        <Button type="button" variant="outline" onClick={onSingle}>
          {t('empty.single')}
        </Button>
      </div>
      {confirmedUnseated > 0 && (
        <p className="text-muted-foreground mt-6 text-xs">
          {t('empty.waiting', { count: confirmedUnseated })}
        </p>
      )}
    </div>
  );
}
