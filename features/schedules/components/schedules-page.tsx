import { type EventApp } from '@/features/events/schemas';
import { getWhatsAppTemplatesByIds } from '../queries/whatsapp-templates';
import { getMessageTypeForTemplate } from '../constants';
import {
  MESSAGE_TYPES,
  type MessageType,
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

export async function SchedulesPage({
  eventId,
  eventDate,
  schedules,
  event,
}: SchedulesPageProps) {
  // Fetch all templates for schedules in one batch
  const templateIds = schedules
    .map((s) => s.templateId)
    .filter((id): id is string => id !== null && id !== undefined);

  const uniqueTemplateIds = Array.from(new Set(templateIds));
  const templateMap = await getWhatsAppTemplatesByIds(uniqueTemplateIds);

  // Group schedules by message type (each message type has at most one schedule)
  const schedulesByMessageType: Partial<Record<MessageType, ScheduleWithTemplate>> = {};

  for (const schedule of schedules) {
    if (!schedule.templateId) continue;

    const messageType = getMessageTypeForTemplate(schedule.templateId);
    if (!messageType) {
      console.warn(
        `Schedule ${schedule.id} has unmapped template ${schedule.templateId} — skipping`,
      );
      continue;
    }

    if (schedulesByMessageType[messageType]) {
      console.warn(
        `Duplicate schedule for message type "${messageType}" — keeping first, skipping ${schedule.id}`,
      );
      continue;
    }

    schedulesByMessageType[messageType] = {
      schedule,
      template: templateMap.get(schedule.templateId) ?? null,
    };
  }

  // Only show types that have actual schedules, in canonical order
  const visibleTypes = MESSAGE_TYPES.filter((type) => schedulesByMessageType[type]);

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
  const contentByType = Object.fromEntries(
    visibleTypes.map((type) => {
      const { schedule, template } = schedulesByMessageType[type]!;
      return [
        type,
        {
          details: (
            <ScheduleTabContent
              schedule={schedule}
              template={template}
              eventDate={eventDate}
              event={event}
            />
          ),
          delivery: <SchedulePerformanceCard scheduleId={schedule.id} />,
        },
      ] as const;
    }),
  ) as Record<MessageType, { details: React.ReactNode; delivery: React.ReactNode }>;

  return (
    <>
      <SchedulesHeader />
      <SchedulesLayout visibleTypes={visibleTypes} contentByType={contentByType} />
    </>
  );
}
