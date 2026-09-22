'use client';

import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReadinessKey } from '../../utils/event-details-form';
import { SECTION_IDS, useEventDetails } from './event-details-context';

const SECTION_FOR: Record<ReadinessKey, string> = {
  venue: SECTION_IDS.where,
  invitation: SECTION_IDS.invitation,
};

/**
 * The one place the page says what is still missing.
 *
 * Both criteria are read off the live form rather than the saved Event, so
 * picking a venue answers the summary immediately instead of leaving it
 * contradicting the field right below it. Each item carries the consequence for
 * a Guest, because "missing" on its own is not a reason to act - and the action
 * sends the Owner to the field rather than making them hunt for it.
 *
 * The same two gaps also surface as Featured Actions on the Home page
 * (ADR 0010); nothing is dismissible here either - an item leaves when it is
 * filled in. When nothing is missing it renders nothing.
 */
export function ReadinessSummary({ missing }: { missing: ReadinessKey[] }) {
  const t = useTranslations('eventDetails.readiness');
  const { focusSection } = useEventDetails();

  // Nothing to say when nothing is missing: the page is the proof.
  if (missing.length === 0) return null;

  // Phone: the heading over a stack of items. Desktop: one row, the heading
  // beside the items, which sit side by side.
  return (
    <div className="border-warning-tint-border bg-warning-tint/50 flex flex-col gap-3 rounded-[18px] border p-3.5 lg:flex-row lg:items-center lg:gap-5 lg:px-[18px] lg:py-4">
      <div className="flex shrink-0 items-start gap-2.5 lg:items-center lg:gap-[11px]">
        <span className="bg-warning-tint text-warning-ink flex size-[30px] shrink-0 items-center justify-center rounded-[9px] lg:size-[34px] lg:rounded-[10px]">
          <TriangleAlert className="size-[17px] lg:size-[18px]" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[15.5px] font-extrabold">
            {t('missingTitle', { count: missing.length })}
          </p>
          <p className="text-muted-foreground text-[12.5px] leading-relaxed lg:hidden">
            {t('missingHint')}
          </p>
        </div>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
        {missing.map((key) => (
          <li
            key={key}
            className="border-warning-tint-border bg-card flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-[11px] py-2.5 lg:px-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <p className="text-[13.5px] font-bold">{t(`${key}.title`)}</p>
              <p className="text-muted-foreground text-xs leading-snug">
                {t(`${key}.consequence`)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="text-primary hover:text-primary h-9 shrink-0 rounded-[10px] px-3 text-[12.5px] font-bold"
              onClick={() => focusSection(SECTION_FOR[key])}
            >
              {t(`${key}.action`)}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
