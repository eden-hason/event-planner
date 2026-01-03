'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
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
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportGuestsState | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasTriggeredRef.current) return;

    // Auto-trigger import when component mounts
    if (guests.length > 0 && !result) {
      hasTriggeredRef.current = true;
      startTransition(async () => {
        const importResult = await importGuests(eventId, guests);
        setResult(importResult);
        onImportComplete(importResult.success);
      });
    }
  }, [eventId, guests, result, onImportComplete]);

  // Loading state
  if (isPending || !result) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
        <Loader2 className="text-primary h-12 w-12 animate-spin" />
        <div className="text-center">
          <p className="font-medium">Importing guests...</p>
          <p className="text-muted-foreground text-sm">
            Please wait while we add {guests.length} guest
            {guests.length === 1 ? '' : 's'} to your event.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (result.success) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-green-700 dark:text-green-400">
            Import Successful!
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {result.importedCount} guest{result.importedCount === 1 ? '' : 's'}{' '}
            {result.importedCount === 1 ? 'has' : 'have'} been added to your
            event.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <XCircle className="h-10 w-10 text-red-600" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-red-700 dark:text-red-400">
          Import Failed
        </p>
        <p className="text-muted-foreground mt-1 text-sm">{result.message}</p>
      </div>
    </div>
  );
}
