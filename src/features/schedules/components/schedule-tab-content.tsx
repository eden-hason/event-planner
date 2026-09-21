import { sendingConfig } from '@/lib/config/sending';
import { type EventApp } from '@/features/events/schemas';
import { type ScheduleApp, type WhatsAppTemplateApp } from '../schemas';
import type { OutreachItemStatus } from '../types';
import { DeliveryInfoCard } from './delivery-info-card';
import { MessagePreview } from './message-preview';
import { MessageTypeCard } from './message-type-card';
import { PersonalNoteCard } from './personal-note-card';
import { ScheduleDetailsCard } from './schedule-details-card';
import { ScheduleLockBadge } from './schedule-lock-badge';
import { ScheduleLockedNotice } from './schedule-locked-notice';
import { ScheduleSaveBar } from './schedule-save-bar';
import { ScheduleSettingsProvider } from './schedule-settings-context';
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
  const locked = status === 'locked';
  const sent = status === 'sent';
  const lockReason = locked ? ('locked' as const) : sent ? ('sent' as const) : null;
  // Everything the organiser could change is closed for the same reasons, so
  // they are decided once here rather than re-derived in each card. A
  // dispatched Schedule counts: its messages are already rendered and queued,
  // so moving the Due Time would change nothing except what the page claims,
  // and a Schedule is no longer marked 'sent' as a unit (ADR 0013).
  const editable =
    !locked &&
    schedule.status !== 'sent' &&
    schedule.status !== 'cancelled' &&
    schedule.status !== 'expired' &&
    schedule.status !== 'disabled' &&
    schedule.dispatchedAt == null;
  // The one Send Window, read where the Dispatcher's own config is readable and
  // handed to the client card rather than duplicated inside it.
  const { sendWindow } = sendingConfig();

  return (
    <ScheduleSettingsProvider key={schedule.id} schedule={schedule} editable={editable}>
      <div className="flex flex-col gap-4">
        {status === 'pending' && schedule.deliveryMethod === 'whatsapp' && <DeliveryInfoCard />}
        {locked && <ScheduleLockedNotice />}

        {/* Single column until there is room for the message preview to sit
            beside the settings without squeezing either. The preview leads on a
            phone: it is the thing the organiser came to check. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4 lg:order-2">
            <MessagePreview
              template={template}
              smsBody={smsBody}
              channel={schedule.deliveryMethod}
              seatingGap={seatingGap}
              event={event}
            />
          </div>

          <div className="flex flex-col gap-3.5 lg:order-1">
            <MessageTypeCard offersNote={Boolean(offersNote)} sent={sent} />
            {offersNote && <PersonalNoteCard lockReason={lockReason} />}
            <ScheduleDetailsCard
              eventDate={eventDate}
              sendWindow={sendWindow}
              lockBadge={sent ? <ScheduleLockBadge /> : undefined}
            />
            <TargetAudienceCard
              targetStatus={schedule.targetStatus}
              disabled={schedule.status === 'cancelled'}
              sent={sent}
              count={audienceCount}
            />
          </div>
        </div>

        <ScheduleSaveBar note={lockReason ?? 'editable'} />
      </div>
    </ScheduleSettingsProvider>
  );
}
