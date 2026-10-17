'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { rsvpPresentation } from '@/features/guests/utils';
import { cn } from '@/lib/utils';

/** How long a just-saved row stays highlighted where it moved to. */
const FLASH_MS = 2400;

type Changes = { added: number; removed: number; dirty: boolean };

/**
 * What the assign view says about its draft and the last save, on desktop and
 * mobile alike: which rows a save just moved (highlighted for a moment), and
 * the footer's headline and summary - pending moves, what the last save did,
 * or the record total.
 */
export function useAssignSaveFeedback({
  saved,
  draft,
  changes,
  totalRecords,
}: {
  saved: ReadonlySet<string>;
  draft: ReadonlySet<string>;
  changes: Changes;
  totalRecords: number;
}) {
  const t = useTranslations('guests.groups');
  /** Rows the last save moved. */
  const [flash, setFlash] = useState<ReadonlySet<string>>(new Set());
  /** What the last save did, until the draft changes again. */
  const [lastSave, setLastSave] = useState<Omit<Changes, 'dirty'> | null>(null);

  useEffect(() => {
    if (flash.size === 0) return;
    const timer = setTimeout(() => setFlash(new Set()), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  /** Call once a save lands, with the ids it moved. */
  const recordSave = useCallback((moved: string[], made: Changes) => {
    setFlash(new Set(moved));
    setLastSave({ added: made.added, removed: made.removed });
  }, []);
  const clearLastSave = useCallback(() => setLastSave(null), []);
  /** Back to no feedback, for a view opened afresh. */
  const reset = useCallback(() => {
    setFlash(new Set());
    setLastSave(null);
  }, []);

  const { added, removed, dirty } = changes;
  const headline =
    draft.size !== saved.size
      ? t('assignScreen.inGroupProjected', { from: saved.size, to: draft.size })
      : t('assignScreen.inGroup', { count: saved.size });
  const summary = dirty
    ? {
        tone: cn(rsvpPresentation('pending').text, 'font-semibold'),
        parts: [
          added > 0 && t('assignScreen.joinPending', { count: added }),
          removed > 0 && t('assignScreen.leavePending', { count: removed }),
          t('assignScreen.unsaved'),
        ],
      }
    : lastSave
      ? {
          tone: cn(rsvpPresentation('confirmed').text, 'font-semibold'),
          parts: [
            t('assignScreen.saved'),
            lastSave.added > 0 &&
              t('assignScreen.joinDone', { count: lastSave.added }),
            lastSave.removed > 0 &&
              t('assignScreen.leaveDone', { count: lastSave.removed }),
          ],
        }
      : {
          tone: 'text-muted-foreground',
          parts: [t('mobile.ofTotalRecords', { count: totalRecords })],
        };

  return {
    flash,
    recordSave,
    clearLastSave,
    reset,
    headline,
    summary: {
      tone: summary.tone,
      text: summary.parts.filter(Boolean).join(' · '),
    },
  };
}
