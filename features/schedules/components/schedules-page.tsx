import { getTranslations } from 'next-intl/server';

import { type EventApp } from '@/features/events/schemas';
import { getEventGuests } from '@/features/guests/queries/guests';
import { getTemplatesByKeys } from '../config/whatsapp-templates';
import {
  ACTION_TYPES,
  type ActionType,
  type GuestStats,
  type ScheduleApp,
  type WhatsAppTemplateApp,
} from '../schemas';
import { filterGuestsByTarget } from '../utils';
import { SchedulePerformanceCard } from './schedule-performance-card';
import { ScheduleTabContent } from './schedule-tab-content';
import { SchedulesHeader } from './schedules-header';
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
  delivery: React.ReactNode;
};

export async function SchedulesPage({
  eventId,
  eventDate,
  schedules,
  event,
}: SchedulesPageProps) {
  const t = await getTranslations('schedules');

  // Resolve all templates for schedules from local config
  const templateKeys = schedules
    .map((s) => s.templateKey)
    .filter((key): key is string => key !== null && key !== undefined);

  const uniqueTemplateKeys = Array.from(new Set(templateKeys));
  const templateMap = getTemplatesByKeys(uniqueTemplateKeys);
  const guests = await getEventGuests(eventId);

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
    return (
      <>
        <SchedulesHeader />
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t('noSchedules')}
        </p>
      </>
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
        details: (
          <ScheduleTabContent
            schedule={schedule}
            template={template}
            eventDate={eventDate}
            event={event}
            guestStats={guestStats}
          />
        ),
        delivery: (
          <SchedulePerformanceCard
            scheduleId={schedule.id}
            scheduledDate={schedule.scheduledDate}
            guestCount={guestCount}
            targetStatus={schedule.targetStatus}
            actionType={schedule.actionType}
            eventId={eventId}
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
