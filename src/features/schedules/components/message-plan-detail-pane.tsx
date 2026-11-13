import { getTranslations } from 'next-intl/server';

import { sendingConfig } from '@/lib/config/sending';

import { isAskStage, type Stage } from '../message-plan';
import { type ScheduleApp } from '../schemas';
import type { MappedEvent } from '../services/map-event-row';
import type { OutreachItemStatus } from '../types';
import type { PreviewGuest } from '../utils/message-plan-editor';
import { rsvpAskOf } from '../utils/schedule-results';
import { isScheduleEditable } from '../utils/schedule-editable';
import { InvitationVideoCard } from './invitation-video-card';
import {
  MessagePlanAttachmentCard,
  MessagePlanButtonsCard,
  MessagePlanGiftCard,
  MessagePlanTimingNote,
} from './message-plan-options-cards';
import { MessagePlanPreview } from './message-plan-preview';
import { MessagePlanSaveBar } from './message-plan-save-bar';
import {
  MessagePlanSettingsProvider,
  type LongestGuest,
} from './message-plan-settings-context';
import { MessagePlanWordingCard } from './message-plan-wording-card';
import { PastDueTimeDialog } from './past-due-time-dialog';
import { PersonalTextEditor } from './personal-text-editor';
import { ScheduleDetailTabs } from './schedule-detail-pane';
import { ScheduleDetailsCard } from './schedule-details-card';
import { ScheduleFooter } from './schedule-footer';
import { ScheduleInteractionsCard } from './schedule-interactions-card';
import { ScheduleLockBadge } from './schedule-lock-badge';
import { ScheduleLockedNotice } from './schedule-locked-notice';
import { ScheduleResultsGhost } from './schedule-results';
import { TargetAudienceCard } from './target-audience-card';

/**
 * What the page works out once per kind of stage (sends tables or not) and
 * hands every pane of that kind: the same objects, so they are not computed
 * five times.
 */
export type MessagePlanGuests = {
  /** The longest name and table the stage sends, for the 400-character count. */
  longest: LongestGuest;
  preview: { presets: PreviewGuest[]; others: PreviewGuest[] };
};

export interface MessagePlanDetailPaneProps {
  schedule: ScheduleApp;
  stage: Stage;
  event: MappedEvent;
  status: OutreachItemStatus;
  audienceCount: number | null;
  guests: MessagePlanGuests;
  siteUrl: string;
  previewToken: string | null;
  /** The Event's SMS Fallback switch, which the results tab describes. */
  smsFallback: boolean;
}

/**
 * One Schedule on the current Message Plan, opened (ADR 0053, 0054, brief 6):
 * the settings and the results, as a Classic Schedule has them. The current
 * plan always sends WhatsApp first (scheduleChannel).
 */
export function MessagePlanDetailPane(props: MessagePlanDetailPaneProps) {
  const { schedule, status, smsFallback } = props;
  const rsvpAsk = rsvpAskOf(schedule.scheduleTypeKey, false);
  return (
    <ScheduleDetailTabs
      settings={<MessagePlanTabContent {...props} />}
      results={
        status === 'sent' ? (
          <ScheduleInteractionsCard
            scheduleId={schedule.id}
            rsvpAsk={rsvpAsk}
            channel="whatsapp"
            sentAt={schedule.sentAt}
            smsFallback={smsFallback}
          />
        ) : (
          <ScheduleResultsGhost
            collectsRsvp={rsvpAsk !== 'none'}
            channel="whatsapp"
            smsFallback={smsFallback}
          />
        )
      }
    />
  );
}

/**
 * The settings lead in the order the Owner decides them - which message, its
 * attachment or gift, its buttons, when, to whom - and the preview closes the
 * stack on a phone, or sits beside it from lg.
 */
async function MessagePlanTabContent({
  schedule,
  stage,
  event,
  status,
  audienceCount,
  guests,
  siteUrl,
  previewToken,
}: MessagePlanDetailPaneProps) {
  const t = await getTranslations('schedules.detail');
  const locked = status === 'locked';
  const sent = status === 'sent';
  const editable = !locked && isScheduleEditable(schedule);
  const { sendWindow, scheduleMaxLatenessHours } = sendingConfig();
  const lockBadge = sent ? <ScheduleLockBadge /> : undefined;
  const eventDate = event.eventDate;
  const ask = isAskStage(stage);

  return (
    <MessagePlanSettingsProvider
      key={schedule.id}
      schedule={schedule}
      stage={stage}
      editable={editable}
      eventDate={eventDate}
      event={event}
      longestGuest={guests.longest}
      dueTimeRules={{ sendWindow, maxLatenessHours: scheduleMaxLatenessHours }}
    >
      <div className="flex flex-col gap-4">
        {locked && <ScheduleLockedNotice />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3.5">
            <MessagePlanWordingCard lockBadge={lockBadge} />
            <PersonalTextEditor lockBadge={lockBadge} />
            {ask ? (
              <MessagePlanAttachmentCard lockBadge={lockBadge} />
            ) : (
              <MessagePlanGiftCard lockBadge={lockBadge} />
            )}
            {/* The video is the Event's, uploaded once for every Ask; it is
                offered here, on the Invitation, which alone may send it. */}
            {stage === 'invitation' && (
              <InvitationVideoCard
                scheduleId={schedule.id}
                eventId={event.id}
                videoUrl={event.invitationVideoUrl ?? null}
                editable={editable}
                lockBadge={lockBadge}
              />
            )}
            <MessagePlanButtonsCard />
            <ScheduleDetailsCard
              eventDate={eventDate}
              scheduleTypeKey={schedule.scheduleTypeKey}
              maxLatenessHours={scheduleMaxLatenessHours}
              sendWindow={sendWindow}
              lockBadge={lockBadge}
              footer={<MessagePlanTimingNote eventDate={eventDate} />}
            />
            <TargetAudienceCard
              targetStatus={schedule.targetStatus}
              disabled={schedule.status === 'cancelled'}
              sent={sent}
              count={audienceCount}
            />
          </div>

          <div className="flex flex-col gap-4">
            <MessagePlanPreview
              presets={guests.preview.presets}
              others={guests.preview.others}
              siteUrl={siteUrl}
              previewToken={previewToken}
            />
          </div>
        </div>

        {editable && <MessagePlanSaveBar />}
        {locked && <ScheduleFooter note={t('footNote.locked')} upgrade />}
        {editable && (
          <PastDueTimeDialog
            targetStatus={schedule.targetStatus}
            audienceCount={audienceCount}
            sendWindow={sendWindow}
          />
        )}
      </div>
    </MessagePlanSettingsProvider>
  );
}
