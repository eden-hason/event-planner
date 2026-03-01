import { type EventApp } from '@/features/events/schemas';
import { type GuestStats, type ScheduleApp, type WhatsAppTemplateApp } from '../schemas';
import { MessageContentCard } from './message-content-card';
import { ScheduleDetailsCard } from './schedule-details-card';
import { ScheduleStatusCard } from './schedule-status-card';
import { TargetAudienceCard } from './target-audience-card';

interface ScheduleTabContentProps {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
  eventDate: string;
  event: EventApp | null;
  guestStats: GuestStats;
}

export function ScheduleTabContent({
  schedule,
  template,
  eventDate,
  event,
  guestStats,
}: ScheduleTabContentProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-4">
        <ScheduleStatusCard schedule={schedule} />
        <ScheduleDetailsCard key={schedule.id} schedule={schedule} eventDate={eventDate} />
        <TargetAudienceCard targetStatus={schedule.targetStatus} guestStats={guestStats} />
      </div>
      <MessageContentCard
        template={template}
        event={event}
      />
    </div>
  );
}
