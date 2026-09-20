import { getLocale, getTranslations } from 'next-intl/server';
import { IconChartBar, IconLayoutGrid } from '@tabler/icons-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type EventApp } from '@/features/events/schemas';

import { type ScheduleApp, type WhatsAppTemplateApp } from '../schemas';
import type { OutreachItemStatus } from '../types';
import { ScheduleInteractionsCard } from './schedule-interactions-card';
import { ScheduleTabContent } from './schedule-tab-content';

interface ScheduleDetailPaneProps {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
  smsBody: string | null;
  seatingGap: { withoutTable: number; total: number } | null;
  offersNote: boolean;
  eventDate: string | null;
  event: EventApp | null;
  status: OutreachItemStatus;
  audienceCount: number | null;
}

/**
 * One message Schedule, opened.
 *
 * A Schedule that has gone out grows a results tab; one that has not is only
 * its settings, because a funnel of zeroes is noise rather than information.
 * The results view is unchanged from before the timeline rebuild - it has its
 * own design coming.
 */
export async function ScheduleDetailPane({
  schedule,
  template,
  smsBody,
  seatingGap,
  offersNote,
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
      template={template}
      smsBody={smsBody}
      seatingGap={seatingGap}
      offersNote={offersNote}
      eventDate={eventDate}
      event={event}
      status={status}
      audienceCount={audienceCount}
    />
  );

  if (status !== 'sent') return settings;

  return (
    <Tabs defaultValue="overview" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <TabsList className="border-border mb-6 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <IconLayoutGrid size={18} />
          {t('tabs.overview')}
        </TabsTrigger>
        <TabsTrigger
          value="results"
          className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <IconChartBar size={18} />
          {t('tabs.results')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{settings}</TabsContent>
      <TabsContent value="results">
        <ScheduleInteractionsCard
          scheduleId={schedule.id}
          collectsRsvp={schedule.scheduleTypeKey === 'confirmation'}
          channel={schedule.deliveryMethod}
        />
      </TabsContent>
    </Tabs>
  );
}
