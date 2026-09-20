import { getTranslations } from 'next-intl/server';

import { sendingConfig } from '@/lib/config/sending';
import { type EventApp } from '@/features/events/schemas';
import { type ScheduleApp, type WhatsAppTemplateApp } from '../schemas';
import type { OutreachItemStatus } from '../types';
import { MessageContentCard } from './message-content-card';
import { MessageTypeCard } from './message-type-card';
import { ScheduleDetailsCard } from './schedule-details-card';
import { ScheduleLockBadge } from './schedule-lock-badge';
import { ScheduleLockedNotice } from './schedule-locked-notice';
import { ScheduleStatusCard } from './schedule-status-card';
import { TargetAudienceCard } from './target-audience-card';

interface ScheduleTabContentProps {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
  smsBody?: string | null;
  seatingGap?: { withoutTable: number; total: number } | null;
  /** Whether this schedule's family offers a note variant at all. */
  offersNote?: boolean;
  eventDate: string | null;
  event: EventApp | null;
  status: OutreachItemStatus;
  /** Size of the target audience as it stands today. */
  audienceCount: number | null;
}

export async function ScheduleTabContent({
  schedule,
  template,
  smsBody,
  seatingGap,
  offersNote,
  eventDate,
  event,
  status,
  audienceCount,
}: ScheduleTabContentProps) {
  const t = await getTranslations('schedules.detail');

  const locked = status === 'locked';
  const sent = status === 'sent';
  // Everything the organiser could change is closed for the same two reasons,
  // so they are decided once here rather than re-derived in each card.
  const readOnly = locked || sent;
  const lockReason = locked ? ('locked' as const) : sent ? ('sent' as const) : null;
  // The one Send Window, read where the Dispatcher's own config is readable and
  // handed to the client card rather than duplicated inside it.
  const { sendWindow } = sendingConfig();

  return (
    <div className="flex flex-col gap-4">
      {locked && <ScheduleLockedNotice />}

      {/* Single column until there is room for the message preview to sit
          beside the settings without squeezing either. The preview leads on a
          phone: it is the thing the organiser came to check. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 lg:order-2">
          <MessageContentCard
            scheduleId={schedule.id}
            template={template}
            smsBody={smsBody}
            channel={schedule.deliveryMethod}
            seatingGap={seatingGap}
            offersNote={offersNote}
            customText={schedule.customText}
            scheduleLocked={readOnly || schedule.status === 'cancelled'}
            event={event}
          />
        </div>

        <div className="flex flex-col gap-4 lg:order-1">
          <MessageTypeCard
            offersNote={Boolean(offersNote)}
            lockReason={lockReason}
          />
          {!sent && <ScheduleStatusCard schedule={schedule} locked={locked} />}
          <ScheduleDetailsCard
            key={schedule.id}
            schedule={schedule}
            eventDate={eventDate}
            locked={locked}
            sendWindow={sendWindow}
            lockBadge={<ScheduleLockBadge reason="locked" />}
          />
          <TargetAudienceCard
            targetStatus={schedule.targetStatus}
            disabled={schedule.status === 'cancelled'}
            count={audienceCount}
          />
        </div>
      </div>

      <p className="text-muted-foreground px-1 text-center text-xs">
        {t(lockReason ? `footNote.${lockReason}` : 'footNote.editable')}
      </p>
    </div>
  );
}
