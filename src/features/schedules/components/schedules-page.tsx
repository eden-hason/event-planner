import { getLocale, getTranslations } from 'next-intl/server';
import { IconChartBar, IconLayoutGrid } from '@tabler/icons-react';

import { type EventApp } from '@/features/events/schemas';
import { getEventGuests } from '@/features/guests/queries/guests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDefaultSchedulesForEventType } from '../queries/catalog';
import {
  SCHEDULE_TYPE_KEYS,
  toWhatsAppTemplate,
  type ScheduleTypeKey,
  type GuestStats,
  type ScheduleApp,
  type WhatsAppTemplateApp,
} from '../schemas';
import { resolveSmsBodyForPreview } from '../utils/parameter-resolvers';
import { filterGuestsByTarget } from '../utils';
import { buildSuggestedSchedules } from '../utils/suggested-schedules';
import { ScheduleInteractionsCard } from './schedule-interactions-card';
import { ScheduleTabContent } from './schedule-tab-content';
import { SchedulesEmptyState } from './schedules-empty-state';
import { SchedulesLayout } from './schedules-layout';

interface SchedulesPageProps {
  eventId: string;
  eventDate: string;
  schedules: ScheduleApp[];
  event: EventApp | null;
}

type ScheduleWithTemplate = {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
  smsBody: string | null;
};

const KNOWN_SCHEDULE_TYPE_KEYS: readonly string[] = SCHEDULE_TYPE_KEYS;

export type ScheduleTabItem = {
  label: string;
  scheduleId: string;
  scheduleStatus: ScheduleApp['status'];
  sentAt?: string;
  scheduledDate: string;
  guestCount: number;
  targetStatus: ScheduleApp['targetStatus'];
  scheduleTypeName: string;
  details: React.ReactNode;
};

export async function SchedulesPage({
  eventId,
  eventDate,
  schedules,
  event,
}: SchedulesPageProps) {
  const t = await getTranslations('schedules');
  const locale = await getLocale();

  const guests = await getEventGuests(eventId);
  const canCreateSchedules = event?.canCreateSchedules ?? false;

  const guestStats: GuestStats = {
    total: guests.length,
    confirmed: guests.filter((g) => g.rsvpStatus === 'confirmed').length,
    pending: guests.filter((g) => g.rsvpStatus === 'pending').length,
    declined: guests.filter((g) => g.rsvpStatus === 'declined').length,
  };

  // Group schedules by schedule type key (multiple allowed for 'confirmation').
  // Each schedule carries its template row from the catalog join. Keyed by
  // plain string, not the closed ScheduleTypeKey union - schedule_types is a
  // DB table and can grow past the four keys known at build time.
  const schedulesByType: Partial<Record<string, ScheduleWithTemplate[]>> = {};

  for (const schedule of schedules) {
    const typeKey = schedule.scheduleTypeKey;
    if (!schedulesByType[typeKey]) {
      schedulesByType[typeKey] = [];
    }
    schedulesByType[typeKey]!.push({
      schedule,
      template: schedule.template ? toWhatsAppTemplate(schedule.template) : null,
      smsBody:
        schedule.template?.channel === 'sms'
          ? resolveSmsBodyForPreview(schedule.template.payload, event).resolvedBody
          : null,
    });
  }

  // Show every type that has actual schedules, not just the four known at
  // build time: known keys first in their canonical order, then any other
  // catalog type (e.g. one added directly to schedule_types) appended after.
  const presentTypes = Object.keys(schedulesByType);
  const visibleTypes = [
    ...SCHEDULE_TYPE_KEYS.filter((type) => schedulesByType[type]),
    ...presentTypes.filter((type) => !KNOWN_SCHEDULE_TYPE_KEYS.includes(type)).sort(),
  ];

  if (visibleTypes.length === 0) {
    const eventType = event?.eventType ?? 'wedding';
    const defaults = await getDefaultSchedulesForEventType(eventType);
    const suggestedSchedules = buildSuggestedSchedules(defaults, eventDate);
    const invitationDefault = defaults.find(
      (d) => d.scheduleTypeKey === 'initial_invitation',
    );
    const invitationTemplate = invitationDefault
      ? toWhatsAppTemplate(invitationDefault.template)
      : null;
    const targetCounts = {
      all: guests.length,
      pending: filterGuestsByTarget(guests, 'pending').length,
      confirmed: filterGuestsByTarget(guests, 'confirmed').length,
    };

    return (
      <SchedulesEmptyState
        eventId={eventId}
        event={event}
        suggestedSchedules={suggestedSchedules}
        invitationTemplate={invitationTemplate}
        targetCounts={targetCounts}
        canCreateSchedules={canCreateSchedules}
      />
    );
  }

  // Pre-render content for all types on the server
  const contentByType: Partial<Record<string, ScheduleTabItem[]>> = {};

  for (const type of visibleTypes) {
    const items = schedulesByType[type]!;
    // Known types use the translated i18n label; anything else (a schedule
    // type added to the catalog outside this build's known set) falls back
    // to its own DB name so it still renders with a sensible label.
    const baseLabel = KNOWN_SCHEDULE_TYPE_KEYS.includes(type)
      ? t(`actionTypes.${type}` as `actionTypes.${ScheduleTypeKey}`)
      : items[0].schedule.scheduleTypeName;
    const multiple = items.length > 1;

    contentByType[type] = items.map(({ schedule, template, smsBody }, index) => {
      const guestCount = filterGuestsByTarget(guests, schedule.targetStatus).length;
      return {
        label: multiple ? `${baseLabel} ${index + 1}` : baseLabel,
        scheduleId: schedule.id,
        scheduleStatus: schedule.status,
        sentAt: schedule.sentAt ?? undefined,
        scheduledDate: schedule.scheduledDate,
        guestCount,
        targetStatus: schedule.targetStatus,
        scheduleTypeName: schedule.scheduleTypeName,
        details: schedule.scheduleTypeKey === 'confirmation' ? (
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
            <TabsContent value="overview">
              <ScheduleTabContent
                schedule={schedule}
                template={template}
                smsBody={smsBody}
                eventDate={eventDate}
                event={event}
                guestStats={guestStats}
              />
            </TabsContent>
            <TabsContent value="results">
              <ScheduleInteractionsCard scheduleId={schedule.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <ScheduleTabContent
            schedule={schedule}
            template={template}
            smsBody={smsBody}
            eventDate={eventDate}
            event={event}
            guestStats={guestStats}
          />
        ),
      };
    });
  }

  return (
    <SchedulesLayout
      visibleTypes={visibleTypes}
      contentByType={contentByType as Record<string, ScheduleTabItem[]>}
    />
  );
}
