import { getLocale, getTranslations } from 'next-intl/server';

import { type EventApp } from '@/features/events/schemas';
import { getEventGuests } from '@/features/guests/queries/guests';
import {
  CallPlanCard,
  CallRoundResultsCard,
} from '@/features/calls/components';
import { getCallRoundsByScheduleId } from '@/features/calls/queries';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import {
  SCHEDULE_TYPE_KEYS,
  toWhatsAppTemplate,
  type ScheduleTypeKey,
  type ScheduleApp,
  type WhatsAppTemplateApp,
} from '../schemas';
import { type OutreachItem } from '../types';
import { resolveSmsBodyForPreview } from '../utils/parameter-resolvers';
import {
  filterGuestsByTarget,
  includesGiftButton,
  hasInvitationImage,
  isMessageSchedule,
  shouldSendTableNumbers,
} from '../utils';
import { offsetDays, timelineStatus } from '../utils/timeline';
import { resolveTemplatesForPreview } from '../queries/resolve-templates';
import { getDeliveryStatsByScheduleId } from '../queries/delivery-stats';
import { isFollowUpConfirmation } from '../utils/confirmation-round';
import { ScheduleDetailPane } from './schedule-detail-pane';
import { SchedulesEmptyState } from './schedules-empty-state';
import { SchedulesLayout } from './schedules-layout';

interface SchedulesPageProps {
  eventId: string;
  /** Null for an event with no date; every offset below is relative to it. */
  eventDate: string | null;
  schedules: ScheduleApp[];
  event: EventApp | null;
}

type ScheduleWithTemplate = {
  schedule: ScheduleApp;
  template: WhatsAppTemplateApp | null;
  smsBody: string | null;
  /**
   * How many targeted guests will get the variant *without* a table number
   * because they have no seating assignment yet. Null when this schedule has
   * no table variant in play, so there is nothing to warn about.
   */
  seatingGap: { withoutTable: number; total: number } | null;
  /** Whether this schedule's family offers a note variant at all. */
  offersNote: boolean;
};

const KNOWN_SCHEDULE_TYPE_KEYS: readonly string[] = SCHEDULE_TYPE_KEYS;

export async function SchedulesPage({
  eventId,
  eventDate,
  schedules,
  event,
}: SchedulesPageProps) {
  const t = await getTranslations('schedules');
  const locale = await getLocale();

  // Nothing to plan yet. Since the seed trigger fires the moment an Event has
  // a type and a date, an empty timeline means one of those is missing - and
  // only the date is something the organiser can supply.
  if (schedules.length === 0) {
    return (
      <SchedulesEmptyState
        eventId={eventId}
        reason={eventDate ? 'unsupported' : 'noDate'}
      />
    );
  }

  const [guests, roundsBySchedule, deliveryStats] = await Promise.all([
    getEventGuests(eventId),
    // RLS-bound: a viewer without Owner access gets an empty map, so a call
    // plan renders as planned rather than exposing its results.
    getCallRoundsByScheduleId(eventId),
    // One aggregate for the whole Event, so a seven-card timeline costs one
    // round trip rather than seven.
    getDeliveryStatsByScheduleId(schedules.map((schedule) => schedule.id)),
  ]);

  // schedule.template is only the family anchor. Resolve what would actually be
  // sent, using the same resolver the send engine runs, so the preview the
  // organiser approves is the message their guests receive.
  const tableNumbers = shouldSendTableNumbers(event?.guestExperience);
  const invitationImage = hasInvitationImage(event?.invitations);

  const resolved = await Promise.all(
    schedules.map(async (schedule): Promise<ScheduleWithTemplate> => {
      if (!schedule.template) {
        return {
          schedule,
          template: null,
          smsBody: null,
          seatingGap: null,
          offersNote: false,
        };
      }

      const resolution = await resolveTemplatesForPreview({
        anchor: schedule.template,
        gifting: includesGiftButton(
          event?.eventSettings,
          schedule.scheduleTypeKey,
        ),
        tableNumbers,
        note: Boolean(schedule.customText?.trim()),
        followUp: isFollowUpConfirmation(schedule, schedules),
        invitationImage,
      });

      // A failed resolution is a seeding bug that will also fail the send.
      // Fall back to the anchor so the page still renders something rather
      // than blanking the card.
      const previewTemplate = resolution.success
        ? (resolution.templates.withTable ?? resolution.templates.withoutTable)
        : schedule.template;

      // Preview the table variant when there is one, and let the gap line
      // account for the guests who will get the other.
      const hasTableVariant =
        resolution.success && resolution.templates.withTable !== null;

      let seatingGap: ScheduleWithTemplate['seatingGap'] = null;
      if (hasTableVariant) {
        const targeted = filterGuestsByTarget(guests, schedule.targetStatus);
        const withoutTable = targeted.filter((guest) => !guest.tableId).length;
        if (withoutTable > 0) {
          seatingGap = { withoutTable, total: targeted.length };
        }
      }

      return {
        schedule,
        template:
          previewTemplate.channel === 'whatsapp'
            ? toWhatsAppTemplate(previewTemplate)
            : null,
        smsBody:
          previewTemplate.channel === 'sms'
            ? resolveSmsBodyForPreview(
                previewTemplate.payload,
                event,
                schedule.customText,
              ).resolvedBody
            : null,
        seatingGap,
        offersNote: resolution.success ? resolution.templates.offersNote : false,
      };
    }),
  );

  // One chronological list. Messages and call rounds used to be two separate
  // menus, which made it impossible to see that a call sits between two
  // reminders - the ordering *is* the plan, so they share one timeline.
  resolved.sort(
    (a, b) =>
      Date.parse(a.schedule.scheduledDate) -
      Date.parse(b.schedule.scheduledDate),
  );

  // A type that appears more than once (a second Confirmation round) is
  // numbered, in the order the timeline shows it.
  const seenOfType = new Map<string, number>();
  const totalOfType = new Map<string, number>();
  for (const { schedule } of resolved) {
    totalOfType.set(
      schedule.scheduleTypeKey,
      (totalOfType.get(schedule.scheduleTypeKey) ?? 0) + 1,
    );
  }

  // Numeric rather than a month name: the card's meta line already carries the
  // channel and the offset, and "21 August" pushed it into an ellipsis on a
  // 375px screen.
  const dayMonth = new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    day: 'numeric',
    month: 'numeric',
  });
  const clock = new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const formatWhen = (iso: string) => dayMonth.format(new Date(iso));
  const formatWhenDetailed = (iso: string) =>
    `${dayMonth.format(new Date(iso))} · ${clock.format(new Date(iso))}`;

  const audienceLabel = (targetStatus: ScheduleApp['targetStatus']) =>
    targetStatus === 'confirmed'
      ? t('audience.confirmedGuests')
      : targetStatus === 'pending'
        ? t('audience.pendingGuests')
        : t('audience.allGuests');

  const items: OutreachItem[] = resolved.map(
    ({ schedule, template, smsBody, seatingGap, offersNote }) => {
      // Known types use the translated i18n label; anything else (a schedule
      // type added to the catalog outside this build's known set) falls back
      // to its own DB name so it still renders with a sensible label.
      const baseLabel = KNOWN_SCHEDULE_TYPE_KEYS.includes(
        schedule.scheduleTypeKey,
      )
        ? t(
            `actionTypes.${schedule.scheduleTypeKey}` as `actionTypes.${ScheduleTypeKey}`,
          )
        : schedule.scheduleTypeName;

      const index = (seenOfType.get(schedule.scheduleTypeKey) ?? 0) + 1;
      seenOfType.set(schedule.scheduleTypeKey, index);
      const label =
        (totalOfType.get(schedule.scheduleTypeKey) ?? 1) > 1
          ? `${baseLabel} ${index}`
          : baseLabel;

      const isMessage = isMessageSchedule(schedule);
      const audienceCount = filterGuestsByTarget(
        guests,
        schedule.targetStatus,
      ).length;
      const round = roundsBySchedule.get(schedule.id);

      // A call round is planned like a message but executed by a person, so it
      // reports the state of its round rather than of a send. The Owner is
      // view-only on a call plan (ADR 0004), so its pane carries no action.
      const status = timelineStatus(schedule, isMessage ? null : round?.status);

      const stats = deliveryStats.get(schedule.id);
      // Only a sent send has a result to report, and only one that produced
      // deliveries can be scored. Read rate where WhatsApp can report it,
      // reached rate otherwise - an SMS schedule never reports a read receipt.
      const miniStat: OutreachItem['miniStat'] =
        status === 'sent' && stats && stats.total > 0
          ? stats.readCapable > 0
            ? {
                percent: Math.round((stats.read / stats.readCapable) * 100),
                kind: 'read' as const,
              }
            : {
                percent: Math.round((stats.reached / stats.total) * 100),
                kind: 'reached' as const,
              }
          : null;

      return {
        id: schedule.id,
        label,
        status,
        kind: isMessage ? ('message' as const) : ('call' as const),
        typeKey: schedule.scheduleTypeKey,
        offset: offsetDays(eventDate, schedule.scheduledDate),
        when: formatWhen(schedule.scheduledDate),
        whenDetailed: formatWhenDetailed(schedule.scheduledDate),
        audience: audienceLabel(schedule.targetStatus),
        audienceCount,
        miniStat,
        details: isMessage ? (
          <ScheduleDetailPane
            schedule={schedule}
            template={template}
            smsBody={smsBody}
            seatingGap={seatingGap}
            offersNote={offersNote}
            eventDate={eventDate}
            event={event}
            status={status}
            audienceCount={audienceCount}
          />
        ) : round ? (
          <CallRoundResultsCard round={round} label={label} />
        ) : (
          <CallPlanCard
            scheduledDate={schedule.scheduledDate}
            targetStatus={schedule.targetStatus}
            eventDate={eventDate}
            cancelled={schedule.status === 'cancelled'}
          />
        ),
      };
    },
  );

  // "The plan is locked" is a property of the Event, not of any one card: every
  // Schedule of an Event that cannot send was seeded 'disabled' together, and
  // paying releases them together.
  const locked = items.some((item) => item.status === 'locked');

  return (
    <SchedulesLayout
      items={items}
      locked={locked}
      hasCalls={items.some((item) => item.kind === 'call')}
      eventDate={eventDate}
    />
  );
}
