import { getTranslations } from 'next-intl/server';
import { IconCalendarPlus } from '@tabler/icons-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

import { SchedulesHeader } from './schedules-header';

interface SchedulesEmptyStateProps {
  eventId: string;
  /**
   * Why there is nothing to show. `noDate` is the ordinary case and the only
   * one the organiser can fix: the plan is seeded from the Event type's
   * defaults the moment a date exists, and every offset is relative to it.
   * `unsupported` is an Event type the catalog has no defaults for.
   */
  reason: 'noDate' | 'unsupported';
}

/**
 * What the schedules page shows when an Event has no outreach at all.
 *
 * This used to be an onboarding prompt - a hero and a button that opened a
 * setup wizard. The wizard is gone: a database trigger seeds the Event type's
 * default set as soon as the Event has a type and a date, so the timeline is
 * something the organiser lands on rather than something they build. What is
 * left is the one case the trigger cannot cover, and the single action that
 * resolves it.
 */
export async function SchedulesEmptyState({
  eventId,
  reason,
}: SchedulesEmptyStateProps) {
  const t = await getTranslations('schedules.empty');

  return (
    <>
      <SchedulesHeader />

      <Empty className="bg-card min-h-[calc(100vh-220px)] border-none shadow-sm">
        <EmptyMedia>
          <img
            src="/hero-schedules.svg"
            alt=""
            aria-hidden="true"
            className="h-64 w-64"
          />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t(`${reason}.title`)}</EmptyTitle>
          <EmptyDescription>{t(`${reason}.description`)}</EmptyDescription>
        </EmptyHeader>
        {reason === 'noDate' && (
          <EmptyContent>
            <Button asChild>
              <Link href={`/app/${eventId}/details`}>
                <IconCalendarPlus className="size-5" />
                {t('noDate.cta')}
              </Link>
            </Button>
          </EmptyContent>
        )}
      </Empty>
    </>
  );
}
