import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getWhatsAppTemplatesByIds } from '../queries/whatsapp-templates';
import { getMessageTypeForTemplate } from '../constants';
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPES,
  MessageType,
  ScheduleApp,
  WhatsAppTemplateApp,
} from '../schemas';
import { ScheduleDetailsCard } from './schedule-details-card';
import { MessageContentCard } from './message-content-card';
import { SchedulesHeader } from './schedules-header';

interface SchedulesPageProps {
  eventId: string;
  eventDate: string;
  schedules: ScheduleApp[];
}

const tabTriggerClassName =
  'data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none';

function ScheduleTabContent({
  schedule,
  template,
  eventDate,
}: {
  schedule: ScheduleApp | undefined;
  template: WhatsAppTemplateApp | null;
  eventDate: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <ScheduleDetailsCard schedule={schedule} template={template} eventDate={eventDate} />
      <MessageContentCard
        template={template}
        deliveryMethod={schedule?.deliveryMethod}
      />
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Schedule Logic</CardTitle>
        </CardHeader>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Schedule Performance</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

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

  // Create a map of schedule ID to template
  const scheduleTemplates = new Map(
    schedules
      .filter((s) => s.templateId && templateMap.has(s.templateId))
      .map((s) => [s.id, templateMap.get(s.templateId!)!]),
  );

  // Group schedules by message type for the tab UI
  const schedulesByMessageType = schedules.reduce((acc, schedule) => {
    if (!schedule.templateId) return acc;

    const messageType = getMessageTypeForTemplate(schedule.templateId) ?? 'initial_invitation';

    if (!acc[messageType]) {
      acc[messageType] = [];
    }

    acc[messageType].push({
      schedule,
      template: scheduleTemplates.get(schedule.id) ?? null,
    });

    return acc;
  }, {} as Record<string, Array<{ schedule: ScheduleApp; template: WhatsAppTemplateApp | null }>>);

  // Helper to get the first schedule and template for a tab
  const getScheduleForTab = (messageType: MessageType) => {
    const items = schedulesByMessageType[messageType];
    return items?.[0] ?? { schedule: undefined, template: null };
  };

  return (
    <>
      <SchedulesHeader />
      <Tabs defaultValue="first_confirmation">
        <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
          {MESSAGE_TYPES.map((type) => (
            <TabsTrigger key={type} value={type} className={tabTriggerClassName}>
              {MESSAGE_TYPE_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>
        {MESSAGE_TYPES.map((type) => {
          const { schedule, template } = getScheduleForTab(type);
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
