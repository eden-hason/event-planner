import { getLocale, getTranslations } from 'next-intl/server';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type EventApp } from '@/features/events/schemas';

import { type ScheduleApp } from '../schemas';
import type { OutreachItemStatus, PreviewMessages } from '../types';
import { ScheduleInteractionsCard } from './schedule-interactions-card';
import { ScheduleResultsGhost } from './schedule-results';
import { ScheduleTabContent } from './schedule-tab-content';

interface ScheduleDetailPaneProps {
  schedule: ScheduleApp;
  messages: PreviewMessages;
  seatingGap: { withoutTable: number; total: number } | null;
  offersNote: boolean;
  foldsNote: boolean;
  eventDate: string | null;
  event: EventApp | null;
  status: OutreachItemStatus;
  audienceCount: number | null;
}

/**
 * One message Schedule, opened.
 *
 * Settings and results, always both. Until the Schedule has gone out the
 * results tab shows what it will hold, faded, rather than a funnel of zeroes.
 */
export async function ScheduleDetailPane({
  schedule,
  messages,
  seatingGap,
  offersNote,
  foldsNote,
  eventDate,
  event,
  status,
  audienceCount,
}: ScheduleDetailPaneProps) {
  const t = await getTranslations('schedules');
  const locale = await getLocale();

  const settings = (
    <ScheduleTabContent
      schedule={schedule}
      messages={messages}
      seatingGap={seatingGap}
      offersNote={offersNote}
      foldsNote={foldsNote}
      eventDate={eventDate}
      event={event}
      status={status}
      audienceCount={audienceCount}
    />
  );

  const collectsRsvp = schedule.scheduleTypeKey === 'confirmation';

  return (
    <Tabs defaultValue="overview" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <TabsList className="border-border mb-4 h-[42px] w-full rounded-none border-b bg-transparent p-0 md:justify-start md:gap-6">
        {(['overview', 'results'] as const).map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-1 rounded-none border-none bg-transparent px-1 md:flex-none text-[14.5px] font-semibold shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t(`tabs.${tab}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview">{settings}</TabsContent>
      <TabsContent value="results">
        {status === 'sent' ? (
          <ScheduleInteractionsCard
            scheduleId={schedule.id}
            collectsRsvp={collectsRsvp}
            channel={schedule.deliveryMethod}
            sentAt={schedule.sentAt}
          />
        ) : (
          <ScheduleResultsGhost
            collectsRsvp={collectsRsvp}
            channel={schedule.deliveryMethod}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
