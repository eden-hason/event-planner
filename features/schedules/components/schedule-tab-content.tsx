import { Card, CardHeader, CardTitle } from '@/components/ui/card';

import { type ScheduleApp, type WhatsAppTemplateApp } from '../schemas';
import { ScheduleDetailsCard } from './schedule-details-card';
import { MessageContentCard } from './message-content-card';

interface ScheduleTabContentProps {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
  eventDate: string;
}

export function ScheduleTabContent({
  schedule,
  template,
  eventDate,
}: ScheduleTabContentProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <ScheduleDetailsCard schedule={schedule} template={template} eventDate={eventDate} />
      <MessageContentCard
        template={template}
        deliveryMethod={schedule.deliveryMethod}
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
