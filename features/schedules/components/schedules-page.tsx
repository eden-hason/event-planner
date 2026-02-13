import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getWhatsAppTemplatesByIds } from '../queries/whatsapp-templates';
import { getMessageTypeForTemplate } from '../constants';
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPES,
  type MessageType,
  type ScheduleApp,
  type WhatsAppTemplateApp,
} from '../schemas';
import { ScheduleTabContent } from './schedule-tab-content';
import { SchedulesHeader } from './schedules-header';

interface SchedulesPageProps {
  eventId: string;
  eventDate: string;
  schedules: ScheduleApp[];
}

type ScheduleWithTemplate = {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
};

const tabTriggerClassName =
  'data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none';

export async function SchedulesPage({
  eventId,
  eventDate,
  schedules,
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

  // Only show tabs for message types that have actual schedules, in canonical order
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

  const defaultTab = visibleTypes[0];

  return (
    <>
      <SchedulesHeader />
      <Tabs defaultValue={defaultTab}>
        <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
          {visibleTypes.map((type) => (
            <TabsTrigger key={type} value={type} className={tabTriggerClassName}>
              {MESSAGE_TYPE_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>
        {visibleTypes.map((type) => {
          const { schedule, template } = schedulesByMessageType[type]!;
          return (
            <TabsContent key={type} value={type}>
              <ScheduleTabContent
                schedule={schedule}
                template={template}
                eventDate={eventDate}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
