'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { IconCircleCheck, IconCircleX, IconLoader2 } from '@tabler/icons-react';
import {
  importGuests,
  type ImportGuestsState,
} from '@/features/guests/actions';
import { type ImportGuestData } from '@/features/guests/schemas';

interface SummaryStepProps {
  eventId: string;
  guests: ImportGuestData[];
  onImportComplete: (success: boolean) => void;
}

export function SummaryStep({
  eventId,
  guests,
  onImportComplete,
}: SummaryStepProps) {
  const t = useTranslations('guests');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportGuestsState | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (hasTriggeredRef.current) return;

    if (guests.length > 0 && !result) {
      hasTriggeredRef.current = true;
      startTransition(async () => {
        const importResult = await importGuests(eventId, guests);
        setResult(importResult);
        onImportComplete(importResult.success);
      });
    }
  }, [eventId, guests, result, onImportComplete]);

  if (isPending || !result) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
        <IconLoader2 size={48} className="text-primary animate-spin" />
        <div className="text-center">
          <p className="font-medium">{t('import.summary.importing')}</p>
          <p className="text-muted-foreground text-sm">
            {guests.length === 1
              ? t('import.summary.importingDescriptionSingular', { count: guests.length })
              : t('import.summary.importingDescription', { count: guests.length })}
          </p>
        </div>
      </div>
    );
  }

  if (result.success) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <IconCircleCheck size={40} className="text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-green-700 dark:text-green-400">
            {t('import.summary.successHeading')}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {(result.importedCount ?? 0) === 1
              ? t('import.summary.successMessageSingular', { count: result.importedCount ?? 0 })
              : t('import.summary.successMessage', { count: result.importedCount ?? 0 })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <IconCircleX size={40} className="text-red-600" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-red-700 dark:text-red-400">
          {t('import.summary.failedHeading')}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">{result.message}</p>
      </div>
    </div>
  );
}
