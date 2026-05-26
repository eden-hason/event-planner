import { getLocale, getTranslations } from 'next-intl/server';
import { IconChartBar, IconLayoutGrid } from '@tabler/icons-react';

import { type EventApp } from '@/features/events/schemas';
import { getEventGuests } from '@/features/guests/queries/guests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTemplatesByKeys } from '../config/whatsapp-templates';
import {
  ACTION_TYPES,
  type ActionType,
  type GuestStats,
  type ScheduleApp,
  type WhatsAppTemplateApp,
} from '../schemas';
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
};

export type ScheduleTabItem = {
  label: string;
  scheduleId: string;
  scheduleStatus: ScheduleApp['status'];
  sentAt?: string;
  scheduledDate: string;
  guestCount: number;
  targetStatus: ScheduleApp['targetStatus'];
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

  // Resolve all templates for schedules from local config
  const templateKeys = schedules
    .map((s) => s.templateKey)
    .filter((key): key is string => key !== null && key !== undefined);

  const uniqueTemplateKeys = Array.from(new Set(templateKeys));
  const templateMap = getTemplatesByKeys(uniqueTemplateKeys);
  const guests = await getEventGuests(eventId);
  const canCreateSchedules = event?.canCreateSchedules ?? false;

  const guestStats: GuestStats = {
    total: guests.length,
    confirmed: guests.filter((g) => g.rsvpStatus === 'confirmed').length,
    pending: guests.filter((g) => g.rsvpStatus === 'pending').length,
    declined: guests.filter((g) => g.rsvpStatus === 'declined').length,
  };

  // Group schedules by actionType (multiple allowed for 'confirmation')
  const schedulesByActionType: Partial<Record<ActionType, ScheduleWithTemplate[]>> = {};

  for (const schedule of schedules) {
    if (!schedulesByActionType[schedule.actionType]) {
      schedulesByActionType[schedule.actionType] = [];
    }
    schedulesByActionType[schedule.actionType]!.push({
      schedule,
      template: schedule.templateKey ? (templateMap.get(schedule.templateKey)?.whatsapp ?? null) : null,
    });
  }

  // Only show types that have actual schedules, in canonical order
  const visibleTypes = ACTION_TYPES.filter((type) => schedulesByActionType[type]);

  if (visibleTypes.length === 0) {
    const eventType = event?.eventType ?? 'wedding';
    const suggestedSchedules = buildSuggestedSchedules(eventType, eventDate);
    const invitationTemplate =
      getTemplatesByKeys(['invitation_casual']).get('invitation_casual')
        ?.whatsapp ?? null;
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
  const contentByType: Partial<Record<ActionType, ScheduleTabItem[]>> = {};

  for (const type of visibleTypes) {
    const items = schedulesByActionType[type]!;
    const baseLabel = t(`actionTypes.${type}`);
    const multiple = items.length > 1;

    contentByType[type] = items.map(({ schedule, template }, index) => {
      const guestCount = filterGuestsByTarget(guests, schedule.targetStatus).length;
      return {
        label: multiple ? `${baseLabel} ${index + 1}` : baseLabel,
        scheduleId: schedule.id,
        scheduleStatus: schedule.status,
        sentAt: schedule.sentAt ?? undefined,
        scheduledDate: schedule.scheduledDate,
        guestCount,
        targetStatus: schedule.targetStatus,
        details: schedule.actionType === 'confirmation' ? (
          <Tabs defaultValue="overview" dir={locale === 'he' ? 'rtl' : 'ltr'}>
            <TabsList className="border-border mb-6 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-base shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <IconLayoutGrid size={18} />
                {t('tabs.overview')}
              </TabsTrigger>
              <TabsTrigger
                value="results"
                className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-base shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <IconChartBar size={18} />
                {t('tabs.results')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <ScheduleTabContent
                schedule={schedule}
                template={template}
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
      contentByType={contentByType as Record<ActionType, ScheduleTabItem[]>}
    />
  );
}
