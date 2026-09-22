'use client';

import { useTranslations } from 'next-intl';
import { CircleCheck, TriangleAlert, MapPin, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReadinessKey } from '../../utils/event-details-form';
import { SECTION_IDS, useEventDetails } from './event-details-context';

const ITEM_META: Record<
  ReadinessKey,
  { sectionId: string; icon: typeof MapPin }
> = {
  venue: { sectionId: SECTION_IDS.where, icon: MapPin },
  invitation: { sectionId: SECTION_IDS.invitation, icon: ImageIcon },
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
 * filled in.
 */
export function ReadinessSummary({ missing }: { missing: ReadinessKey[] }) {
  const t = useTranslations('eventDetails.readiness');
  const { focusSection } = useEventDetails();

  if (missing.length === 0) {
    return (
      <div className="border-success/20 bg-success/10 text-success flex items-center gap-2 rounded-xl border px-3 py-2.5">
        <CircleCheck className="size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{t('readyTitle')}</p>
          <p className="text-success/90 text-xs">{t('readyDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-warning/20 bg-warning/10 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <TriangleAlert className="text-warning mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-warning text-sm font-bold">
            {t('missingTitle', { count: missing.length })}
          </p>
          <p className="text-warning/90 text-xs">{t('missingHint')}</p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {missing.map((key) => {
          const { sectionId, icon: Icon } = ITEM_META[key];
          return (
            <li
              key={key}
              className={cn(
                'bg-card flex items-center gap-3 rounded-lg border px-3 py-2.5',
              )}
            >
              <Icon className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t(`${key}.title`)}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t(`${key}.consequence`)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => focusSection(sectionId)}
              >
                {t(`${key}.action`)}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
