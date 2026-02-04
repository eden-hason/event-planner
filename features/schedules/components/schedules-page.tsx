import { BarChart3, Clock, Power } from 'lucide-react';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getMessageTemplateById } from '../queries';
import { MESSAGE_TYPE_LABELS, MessageType, ScheduleApp } from '../schemas';
import { MessageContentCard } from './message-content-card';
import { SchedulesHeader } from './schedules-header';

interface SchedulesPageProps {
  eventId: string;
  schedules: ScheduleApp[];
}

const tabTriggerClassName =
  'data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none';

export async function SchedulesPage({
  eventId,
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
  console.log(templatesMap);

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
          <TabsTrigger
            value="initial_invitation"
            className={tabTriggerClassName}
          >
            {MESSAGE_TYPE_LABELS.initial_invitation}
          </TabsTrigger>
          <TabsTrigger
            value="first_confirmation"
            className={tabTriggerClassName}
          >
            {MESSAGE_TYPE_LABELS.first_confirmation}
          </TabsTrigger>
          <TabsTrigger
            value="second_confirmation"
            className={tabTriggerClassName}
          >
            {MESSAGE_TYPE_LABELS.second_confirmation}
          </TabsTrigger>
          <TabsTrigger value="event_reminder" className={tabTriggerClassName}>
            {MESSAGE_TYPE_LABELS.event_reminder}
          </TabsTrigger>
          <TabsTrigger value="thank_you" className={tabTriggerClassName}>
            {MESSAGE_TYPE_LABELS.thank_you}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="initial_invitation">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-4 w-4" />
                  Automation Status
                </CardTitle>
              </CardHeader>
            </Card>
            <MessageContentCard
              messageBody={getMessageBodyForTab('initial_invitation')}
            />
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Logic
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Schedule Performance
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="first_confirmation">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-4 w-4" />
                  Automation Status
                </CardTitle>
              </CardHeader>
            </Card>
            <MessageContentCard
              messageBody={getMessageBodyForTab('first_confirmation')}
            />
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Logic
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Schedule Performance
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="second_confirmation">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-4 w-4" />
                  Automation Status
                </CardTitle>
              </CardHeader>
            </Card>
            <MessageContentCard
              messageBody={getMessageBodyForTab('second_confirmation')}
            />
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Logic
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Schedule Performance
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="event_reminder">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-4 w-4" />
                  Automation Status
                </CardTitle>
              </CardHeader>
            </Card>
            <MessageContentCard
              messageBody={getMessageBodyForTab('event_reminder')}
            />
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Logic
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Schedule Performance
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="thank_you">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-4 w-4" />
                  Automation Status
                </CardTitle>
              </CardHeader>
            </Card>
            <MessageContentCard
              messageBody={getMessageBodyForTab('thank_you')}
            />
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Logic
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Schedule Performance
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
