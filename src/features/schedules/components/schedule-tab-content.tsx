import { getTranslations } from 'next-intl/server';

import { sendingConfig } from '@/lib/config/sending';
import { type EventApp } from '@/features/events/schemas';
import { type ScheduleApp } from '../schemas';
import type { OutreachItemStatus, PreviewMessages } from '../types';
import { MessagePreview } from './message-preview';
import { MessageTypeCard } from './message-type-card';
import { PastDueTimeDialog } from './past-due-time-dialog';
import { PersonalMessageCard } from './personal-message-card';
import { PersonalNoteCard } from './personal-note-card';
import { ScheduleDetailsCard } from './schedule-details-card';
import { ScheduleLockBadge } from './schedule-lock-badge';
import { ScheduleLockedNotice } from './schedule-locked-notice';
import { ScheduleFooter } from './schedule-footer';
import { ScheduleSaveBar } from './schedule-save-bar';
import { ScheduleSettingsProvider } from './schedule-settings-context';
import { TargetAudienceCard } from './target-audience-card';

interface ScheduleTabContentProps {
  schedule: ScheduleApp;
  messages: PreviewMessages;
  seatingGap?: { withoutTable: number; total: number } | null;
  /** Whether this schedule's family offers a note variant at all. */
  offersNote?: boolean;
  /** Whether the note version folds the note onto one line (see foldsNote). */
  foldsNote?: boolean;
  /** Whether this Schedule Type has a Personal Message family to send. */
  offersPersonalMessage?: boolean;
  eventDate: string | null;
  event: EventApp | null;
  status: OutreachItemStatus;
  /** Size of the target audience as it stands today. */
  audienceCount: number | null;
}

export async function ScheduleTabContent({
  schedule,
  messages,
  seatingGap,
  offersNote,
  foldsNote,
  offersPersonalMessage,
  eventDate,
  event,
  status,
  audienceCount,
}: ScheduleTabContentProps) {
  const t = await getTranslations('schedules.detail');
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
  const { sendWindow, scheduleMaxLatenessHours } = sendingConfig();

  return (
    <ScheduleSettingsProvider
      key={schedule.id}
      schedule={schedule}
      editable={editable}
      eventDate={eventDate}
      dueTimeRules={{ sendWindow, maxLatenessHours: scheduleMaxLatenessHours }}
    >
      <div className="flex flex-col gap-4">
        {locked && <ScheduleLockedNotice />}

        {/* Single column until there is room for the message preview to sit
            beside the settings without squeezing either. The settings lead in
            the order the organiser decides them - what to send, when, the note
            that goes with it, to whom - and the preview closes the stack on a
            phone as the result of those choices. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3.5">
            <MessageTypeCard
              offersPersonalMessage={Boolean(offersPersonalMessage)}
              lockBadge={sent ? <ScheduleLockBadge /> : undefined}
            />
            {offersPersonalMessage && <PersonalMessageCard lockReason={lockReason} />}
            <ScheduleDetailsCard
              eventDate={eventDate}
              scheduleTypeKey={schedule.scheduleTypeKey}
              maxLatenessHours={scheduleMaxLatenessHours}
              sendWindow={sendWindow}
              lockBadge={sent ? <ScheduleLockBadge /> : undefined}
            />
            {/* The note is retired (ADR 0046): only a Schedule that already
                carries one still shows it, so its Owner can clear it. */}
            {offersNote && schedule.customText && (
              <PersonalNoteCard lockReason={lockReason} foldsNote={Boolean(foldsNote)} />
            )}
            <TargetAudienceCard
              targetStatus={schedule.targetStatus}
              disabled={schedule.status === 'cancelled'}
              sent={sent}
              count={audienceCount}
            />
          </div>

          <div className="flex flex-col gap-4">
            <MessagePreview
              messages={messages}
              channel={schedule.deliveryMethod}
              seatingGap={seatingGap}
              event={event}
            />
          </div>
        </div>

        {/* An editable Schedule's bar appears with its first unsaved change. A
            locked one keeps a bar for the way to unlock it; a sent one has
            nothing left to save, and its cards already say so. */}
        {editable && <ScheduleSaveBar />}
        {locked && <ScheduleFooter note={t('footNote.locked')} upgrade />}
        {editable && (
          <PastDueTimeDialog
            targetStatus={schedule.targetStatus}
            audienceCount={audienceCount}
            sendWindow={sendWindow}
          />
        )}
      </div>
    </ScheduleSettingsProvider>
  );
}
