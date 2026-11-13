import { getLocale, getTranslations } from 'next-intl/server';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sendingConfig } from '@/lib/config/sending';

import { isAskStage, type MessagePlanGuestTable, type Stage } from '../message-plan';
import { type ScheduleApp } from '../schemas';
import type { MappedEvent } from '../services/map-event-row';
import type { OutreachItemStatus } from '../types';
import type { PreviewGuest } from '../utils/message-plan-editor';
import { rsvpAskOf } from '../utils/schedule-results';
import { InvitationVideoCard } from './invitation-video-card';
import {
  MessagePlanAttachmentCard,
  MessagePlanButtonsCard,
  MessagePlanGiftCard,
  MessagePlanTimingNote,
} from './message-plan-options-cards';
import { MessagePlanPreview } from './message-plan-preview';
import { MessagePlanSaveBar } from './message-plan-save-bar';
import { MessagePlanSettingsProvider } from './message-plan-settings-context';
import { MessagePlanWordingCard } from './message-plan-wording-card';
import { PastDueTimeDialog } from './past-due-time-dialog';
import { PersonalTextEditor } from './personal-text-editor';
import { ScheduleDetailsCard } from './schedule-details-card';
import { ScheduleFooter } from './schedule-footer';
import { ScheduleInteractionsCard } from './schedule-interactions-card';
import { ScheduleLockBadge } from './schedule-lock-badge';
import { ScheduleLockedNotice } from './schedule-locked-notice';
import { ScheduleResultsGhost } from './schedule-results';
import { TargetAudienceCard } from './target-audience-card';

export interface MessagePlanDetailPaneProps {
  schedule: ScheduleApp;
  stage: Stage;
  event: MappedEvent;
  status: OutreachItemStatus;
  audienceCount: number | null;
  /** Every Guest's name and table, for the count against the longest name. */
  guests: { name: string; table: MessagePlanGuestTable | null }[];
  preview: { presets: PreviewGuest[]; others: PreviewGuest[] };
  siteUrl: string;
  previewToken: string | null;
  /** The Event's SMS Fallback switch, which the results tab describes. */
  smsFallback: boolean;
}

/**
 * One Schedule on the current Message Plan, opened (ADR 0053, 0054, brief 6):
 * the settings and the results, as a Classic Schedule has them. The settings
 * lead in the order the Owner decides them - which message, its attachment
 * or gift, its buttons, when, to whom - and the preview closes the stack on a
 * phone, or sits beside it from lg.
 */
export async function MessagePlanDetailPane(props: MessagePlanDetailPaneProps) {
  const t = await getTranslations('schedules');
  const locale = await getLocale();
  const { schedule, status } = props;

  return (
    <Tabs defaultValue="overview" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <TabsList className="border-border mb-4 h-[42px] w-full rounded-none border-b bg-transparent p-0 md:justify-start md:gap-6">
        {(['overview', 'results'] as const).map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-1 rounded-none border-none bg-transparent px-1 text-[14.5px] font-semibold shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none md:flex-none"
          >
            {t(`tabs.${tab}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview">
        <MessagePlanTabContent {...props} />
      </TabsContent>
      <TabsContent value="results">
        {/* The current plan always sends WhatsApp first (scheduleChannel). */}
        {status === 'sent' ? (
          <ScheduleInteractionsCard
            scheduleId={schedule.id}
            rsvpAsk={rsvpAskOf(schedule.scheduleTypeKey, false)}
            channel="whatsapp"
            sentAt={schedule.sentAt}
            smsFallback={props.smsFallback}
          />
        ) : (
          <ScheduleResultsGhost
            collectsRsvp={rsvpAskOf(schedule.scheduleTypeKey, false) !== 'none'}
            channel="whatsapp"
            smsFallback={props.smsFallback}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}

async function MessagePlanTabContent({
  schedule,
  stage,
  event,
  status,
  audienceCount,
  guests,
  preview,
  siteUrl,
  previewToken,
}: MessagePlanDetailPaneProps) {
  const t = await getTranslations('schedules.detail');
  const locked = status === 'locked';
  const sent = status === 'sent';
  // The Classic page's rule: a claimed Schedule's messages are already queued.
  const editable =
    !locked &&
    schedule.status !== 'sent' &&
    schedule.status !== 'cancelled' &&
    schedule.status !== 'expired' &&
    schedule.status !== 'disabled' &&
    schedule.dispatchedAt == null;
  const { sendWindow, scheduleMaxLatenessHours } = sendingConfig();
  const lockBadge = sent ? <ScheduleLockBadge /> : undefined;
  const eventDate = event.eventDate;

  return (
    <MessagePlanSettingsProvider
      key={schedule.id}
      schedule={schedule}
      stage={stage}
      editable={editable}
      eventDate={eventDate}
      event={event}
      guests={guests}
      dueTimeRules={{ sendWindow, maxLatenessHours: scheduleMaxLatenessHours }}
    >
      <div className="flex flex-col gap-4">
        {locked && <ScheduleLockedNotice />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3.5">
            <MessagePlanWordingCard lockBadge={lockBadge} />
            <PersonalTextEditor lockBadge={lockBadge} />
            {isAskStage(stage) && <MessagePlanAttachmentCard lockBadge={lockBadge} />}
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
            {!isAskStage(stage) && <MessagePlanGiftCard lockBadge={lockBadge} />}
            <MessagePlanButtonsCard />
            <ScheduleDetailsCard
              eventDate={eventDate}
              scheduleTypeKey={schedule.scheduleTypeKey}
              maxLatenessHours={scheduleMaxLatenessHours}
              sendWindow={sendWindow}
              lockBadge={lockBadge}
              note={<MessagePlanTimingNote eventDate={eventDate} />}
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
              presets={preview.presets}
              others={preview.others}
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
