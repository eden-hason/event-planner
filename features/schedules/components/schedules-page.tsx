import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getMessageTemplateById } from '../queries';
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPES,
  MessageType,
  ScheduleApp,
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
  messageBody,
  eventDate,
}: {
  schedule: ScheduleApp | undefined;
  messageBody: string;
  eventDate: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <ScheduleDetailsCard schedule={schedule} eventDate={eventDate} />
      <MessageContentCard
        messageBody={messageBody}
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
  // Fetch all templates for schedules that have a templateId
  const templatePromises = schedules
    .filter((s) => s.templateId)
    .map(async (s) => {
      const template = await getMessageTemplateById(s.templateId!);
      return { scheduleId: s.id, template };
    });

  const templateResults = await Promise.all(templatePromises);
  const templatesMap = new Map(
    templateResults.map((r) => [r.scheduleId, r.template]),
  );

  // Helper to find schedule by message type
  const getScheduleForTab = (
    messageType: MessageType,
  ): ScheduleApp | undefined => {
    return schedules.find((s) => s.messageType === messageType);
  };

  // Helper to get message body for a tab
  const getMessageBodyForTab = (messageType: MessageType): string => {
    const schedule = getScheduleForTab(messageType);
    if (!schedule) return 'No message content configured yet.';

    // Use custom content if available, otherwise use template
    if (schedule.customContent?.body) {
      return schedule.customContent.body;
    }

    const template = templatesMap.get(schedule.id);
    if (template?.bodyTemplate) {
      return template.bodyTemplate;
    }

    return 'No message content configured yet.';
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
          const schedule = getScheduleForTab(type);
          return (
            <TabsContent key={type} value={type}>
              <ScheduleTabContent
                schedule={schedule}
                messageBody={getMessageBodyForTab(type)}
                eventDate={eventDate}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
