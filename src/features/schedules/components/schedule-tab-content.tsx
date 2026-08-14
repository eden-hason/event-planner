import { type EventApp } from '@/features/events/schemas';
import { type ScheduleApp, type WhatsAppTemplateApp } from '../schemas';
import { MessageContentCard } from './message-content-card';
import { ScheduleDetailsCard } from './schedule-details-card';
import { ScheduleStatusCard } from './schedule-status-card';
import { TargetAudienceCard } from './target-audience-card';

interface ScheduleTabContentProps {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
  smsBody?: string | null;
  eventDate: string;
  event: EventApp | null;
}

export function ScheduleTabContent({
  schedule,
  template,
  smsBody,
  eventDate,
  event,
}: ScheduleTabContentProps) {
  return (
    // Single column until there is room for the message preview to sit beside
    // the settings without squeezing either.
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <ScheduleStatusCard schedule={schedule} />
        <ScheduleDetailsCard key={schedule.id} schedule={schedule} eventDate={eventDate} />
        <TargetAudienceCard
          targetStatus={schedule.targetStatus}
          disabled={schedule.status === 'cancelled'}
        />
      </div>
      <div className="h-full">
        <MessageContentCard
          template={template}
          smsBody={smsBody}
          event={event}
        />
      </div>
    </div>
  );
}
