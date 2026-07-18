import { type EventApp } from '@/features/events/schemas';
import { type GuestStats, type ScheduleApp, type WhatsAppTemplateApp } from '../schemas';
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
  guestStats: GuestStats;
}

export function ScheduleTabContent({
  schedule,
  template,
  smsBody,
  eventDate,
  event,
  guestStats,
}: ScheduleTabContentProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-4">
        <ScheduleStatusCard schedule={schedule} />
        <ScheduleDetailsCard key={schedule.id} schedule={schedule} eventDate={eventDate} />
        <TargetAudienceCard
          targetStatus={schedule.targetStatus}
          guestStats={guestStats}
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
