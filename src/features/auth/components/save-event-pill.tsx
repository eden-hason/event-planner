'use client';

import { useTranslations } from 'next-intl';
import { CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSaveEvent } from './save-event-provider';

/**
 * "Save your event", standing in the header for as long as the Event is a
 * Visitor's (ADR 0028). Renders nothing for an Owner.
 */
export function SaveEventPill({ className }: { className?: string }) {
  const t = useTranslations('saveEvent');
  const { isVisitor, openSave } = useSaveEvent();
  if (!isVisitor) return null;

  return (
    <button
      type="button"
      onClick={() => openSave()}
      className={cn(
        'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors',
        className,
      )}
    >
      <CloudUpload className="size-4" />
      {t('pill')}
    </button>
  );
}
