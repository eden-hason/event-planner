'use client';

import { useTranslations } from 'next-intl';
import { IconCircleCheck, IconCircleX, IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type { ImportGuestsState } from '@/features/guests/actions';

export interface SkipReason {
  key: string;
  label: string;
  count: number;
}

interface MobileSummaryStepProps {
  status: 'importing' | 'success' | 'error';
  result: ImportGuestsState | null;
  totalFileRows: number;
  reasons: SkipReason[];
  onGoToGuestList: () => void;
  onImportAnother: () => void;
}

export function MobileSummaryStep({
  status,
  result,
  totalFileRows,
  reasons,
  onGoToGuestList,
  onImportAnother,
}: MobileSummaryStepProps) {
  const t = useTranslations('guests.import');
  const ts = useTranslations('guests.import.mobile.summary');

  if (status === 'importing') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <IconLoader2 size={44} className="text-primary animate-spin" />
        <p className="font-semibold">{t('summary.importing')}</p>
      </div>
    );
  }

  if (status === 'error' || !result?.success) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
          <IconCircleX size={36} className="text-destructive" />
        </div>
        <div>
          <p className="text-destructive text-lg font-semibold">
            {t('summary.failedHeading')}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">{result?.message}</p>
        </div>
        <Button variant="outline" onClick={onImportAnother}>
          {ts('importAnother')}
        </Button>
      </div>
    );
  }

  const importedCount = result.importedCount ?? 0;
  const skippedCount = Math.max(0, totalFileRows - importedCount);
  const seats = result.seatsImported ?? 0;
  const newGroups = result.newGroupsCount ?? 0;
  const nonZeroReasons = reasons.filter((r) => r.count > 0);
  const explainedSkipCount = nonZeroReasons.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="bg-success/10 flex size-16 items-center justify-center rounded-full">
          <IconCircleCheck size={34} className="text-success" />
        </div>
        <span className="text-xl font-bold">
          {ts('guestsAdded', { count: importedCount })}
        </span>
        <span className="text-muted-foreground text-sm">
          {ts('fromFile', { total: totalFileRows, seats })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card flex flex-col items-center gap-0.5 rounded-xl border p-3">
          <span className="text-success text-xl font-bold">{importedCount}</span>
          <span className="text-muted-foreground text-xs">{ts('statImported')}</span>
        </div>
        <div className="bg-card flex flex-col items-center gap-0.5 rounded-xl border p-3">
          <span className="text-warning text-xl font-bold">{skippedCount}</span>
          <span className="text-muted-foreground text-xs">{ts('statSkipped')}</span>
        </div>
        <div className="bg-card flex flex-col items-center gap-0.5 rounded-xl border p-3">
          <span className="text-primary text-xl font-bold">{newGroups}</span>
          <span className="text-muted-foreground text-xs">{ts('statNewGroups')}</span>
        </div>
      </div>

      {nonZeroReasons.length > 0 && (
        <div className="bg-card overflow-hidden rounded-xl border">
          <div className="border-b px-3.5 py-2.5 text-sm font-semibold">
            {ts('reasonsHeading', { count: explainedSkipCount })}
          </div>
          {nonZeroReasons.map((reason) => (
            <div
              key={reason.key}
              className="flex items-center justify-between border-b px-3.5 py-2.5 text-sm last:border-b-0"
            >
              <span className="text-muted-foreground">{reason.label}</span>
              <span className="font-semibold">{reason.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-primary/5 border-primary/20 rounded-xl border p-3 text-sm leading-relaxed">
        {ts('pendingNote')}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <Button onClick={onGoToGuestList}>{ts('goToGuestList')}</Button>
        <Button variant="ghost" onClick={onImportAnother}>
          {ts('importAnother')}
        </Button>
      </div>
    </div>
  );
}
