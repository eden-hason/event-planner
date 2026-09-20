'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { IconLock, IconSparkles } from '@tabler/icons-react';

import {
  EventBillingStatusSheet,
  useEventBillingStatus,
} from '@/features/billing';
import { useCollaboration } from '@/components/feature-layout';

/**
 * What a locked Schedule says for itself.
 *
 * The timeline already carries one upsell banner, so this is not a second
 * pitch: it explains that everything on this screen is real and already
 * written, and that only sending is gated. The organiser drilled in to read
 * the message, and the honest thing is to let them - then tell them what the
 * one closed door is.
 *
 * The action opens the same `EventBillingStatusSheet` as every other billing
 * surface, because checkout is a conversation rather than a button.
 */
export function ScheduleLockedNotice() {
  const t = useTranslations('schedules.locked');
  const status = useEventBillingStatus();
  const { isOwner } = useCollaboration();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className="bg-warning/10 border-warning/30 flex items-start gap-3 rounded-xl border p-3.5">
        <span
          aria-hidden
          className="bg-warning text-warning-foreground flex size-8 shrink-0 items-center justify-center rounded-lg"
        >
          <IconLock size={15} stroke={2.2} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-warning text-sm font-bold">{t('title')}</p>
          <p className="text-warning/90 text-xs leading-relaxed">
            {t('description')}
          </p>
          {status && isOwner && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-primary mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-bold"
            >
              <IconSparkles size={14} />
              {t('cta')}
            </button>
          )}
        </div>
      </div>

      {status && (
        <EventBillingStatusSheet
          open={open}
          onOpenChange={setOpen}
          status={status}
        />
      )}
    </>
  );
}
