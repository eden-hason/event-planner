import { type EventApp } from '@/features/events/schemas';
import { type ScheduleApp, type WhatsAppTemplateApp } from '../schemas';
import { MessageContentCard } from './message-content-card';
import { ScheduleDetailsCard } from './schedule-details-card';
import { ScheduleStatusCard } from './schedule-status-card';

interface ScheduleTabContentProps {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
  eventDate: string;
  event: EventApp | null;
}

export function ScheduleTabContent({
  schedule,
  template,
  eventDate,
  event,
}: ScheduleTabContentProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-4">
        <ScheduleStatusCard schedule={schedule} />
        <ScheduleDetailsCard schedule={schedule} eventDate={eventDate} />
      </div>
      <MessageContentCard
        template={template}
        deliveryMethod={schedule.deliveryMethod}
        event={event}
      />
    </div>
  );
}
