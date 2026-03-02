import { type EventApp } from '@/features/events/schemas';
import { getEventGuests } from '@/features/guests/queries/guests';
import { getTemplatesByKeys } from '../config/whatsapp-templates';
import {
  ACTION_TYPE_LABELS,
  ACTION_TYPES,
  type ActionType,
  type GuestStats,
  type ScheduleApp,
  type WhatsAppTemplateApp,
} from '../schemas';
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
  details: React.ReactNode;
  delivery: React.ReactNode;
};

export async function SchedulesPage({
  eventId,
  eventDate,
  schedules,
  event,
}: SchedulesPageProps) {
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
          No schedules configured for this event.
        </p>
      </>
    );
  }

  // Pre-render content for all types on the server
  const contentByType: Partial<Record<ActionType, ScheduleTabItem[]>> = {};

  for (const type of visibleTypes) {
    const items = schedulesByActionType[type]!;
    const baseLabel = ACTION_TYPE_LABELS[type];
    const multiple = items.length > 1;

    contentByType[type] = items.map(({ schedule, template }, index) => ({
      label: multiple ? `${baseLabel} ${index + 1}` : baseLabel,
      details: (
        <ScheduleTabContent
          schedule={schedule}
          template={template}
          eventDate={eventDate}
          event={event}
          guestStats={guestStats}
        />
      ),
      delivery: <SchedulePerformanceCard scheduleId={schedule.id} />,
    }));
  }

  return (
    <>
      <SchedulesHeader />
      <SchedulesLayout
        visibleTypes={visibleTypes}
        contentByType={contentByType as Record<ActionType, ScheduleTabItem[]>}
      />
    </>
  );
}
