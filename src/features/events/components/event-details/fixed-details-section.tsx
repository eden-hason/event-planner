'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SECTION_IDS, useEventDetails } from './event-details-context';
import { SectionCard } from './section-card';

/**
 * What this page shows but does not let the Owner change.
 *
 * Both are answered during onboarding and read all over the product: the event
 * type decides which fields this page even has, and the title names the Event in
 * every message and on its guest page. Stating them here is the point - an Owner
 * looking for "where do I change the type" should find the answer, not a gap.
 */
export function FixedDetailsSection({
  eventTitle,
  typeLabel,
}: {
  eventTitle: string;
  typeLabel: string | null;
}) {
  const t = useTranslations('eventDetails.fixed');
  const { eventType } = useEventDetails();

  return (
    <SectionCard
      id={SECTION_IDS.fixed}
      icon={<Lock className="text-muted-foreground size-4 shrink-0" />}
      title={t('title')}
    >
      <dl className="flex flex-col gap-3">
        {eventType && (
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div className="min-w-0">
              <dt className="text-sm font-semibold">{t('eventType')}</dt>
              <dd className="text-muted-foreground text-xs">{t('eventTypeHint')}</dd>
            </div>
            <Badge variant="secondary" className="shrink-0 rounded-full">
              {typeLabel}
            </Badge>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <dt className="text-sm font-semibold">{t('eventTitle')}</dt>
            <dd className="text-muted-foreground text-xs">{t('eventTitleHint')}</dd>
          </div>
          <span className="max-w-[45%] truncate text-xs font-semibold">
            {eventTitle || t('noTitle')}
          </span>
        </div>
      </dl>
    </SectionCard>
  );
}
