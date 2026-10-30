import { getLocale, getTranslations } from 'next-intl/server';

import type { EventApp } from '@/features/events/schemas';
import { getEventGuests } from '@/features/guests/queries/guests';
import { callPaneState } from '@/features/calls';
import { CallRoundPane } from '@/features/calls/components';
import { getCallRoundsByScheduleId } from '@/features/calls/queries';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import {
  SCHEDULE_TYPE_KEYS,
  type ScheduleTypeKey,
  type ScheduleApp,
} from '../schemas';
import { type OutreachItem, type PreviewMessages } from '../types';
import { foldsNote } from '../utils/parameter-resolvers';
import {
  filterGuestsByTarget,
  includesGiftButton,
  hasInvitationImage,
  isMessageSchedule,
  shouldSendTableNumbers,
} from '../utils';
import {
  comparePlanOrder,
  daysUntil,
  numberPlan,
  offsetDays,
  timelineStatus,
} from '../utils/timeline';
import { heroModel, type HeroEntry } from '../utils/hero';
import {
  getPersonalMessageCatalog,
  resolveTemplatesForPreview,
} from '../queries/resolve-templates';
import { getSentCountByScheduleId } from '../queries/sent-counts';
import { isFollowUpConfirmation } from '../utils/confirmation-round';
import { DeliveryInfoButton } from './delivery-info-button';
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
  messages: PreviewMessages;
  /**
   * How many targeted guests will get the variant *without* a table number
   * because they have no seating assignment yet. Null when this schedule has
   * no table variant in play, so there is nothing to warn about.
   */
  seatingGap: { withoutTable: number; total: number } | null;
  /** Whether this schedule's family offers a note variant at all. */
  offersNote: boolean;
  /** Whether the note version folds the note onto one line (see foldsNote). */
  foldsNote: boolean;
  /** Whether this Schedule Type has a Personal Message family to send. */
  offersPersonalMessage: boolean;
};

const KNOWN_SCHEDULE_TYPE_KEYS: readonly string[] = SCHEDULE_TYPE_KEYS;

export async function SchedulesPage({
  eventId,
  eventDate,
  schedules,
  event,
}: SchedulesPageProps) {
  const [t, tCalls, locale] = await Promise.all([
    getTranslations('schedules'),
    getTranslations('calls'),
    getLocale(),
  ]);

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

  const [guests, roundsBySchedule, sentCounts, personalMessageCatalog] = await Promise.all([
    getEventGuests(eventId),
    // RLS-bound: a viewer without Owner access gets an empty map, so a call
    // plan renders as planned rather than exposing its results.
    getCallRoundsByScheduleId(eventId),
    // One aggregate for the whole Event, so a seven-card timeline costs one
    // round trip rather than seven.
    getSentCountByScheduleId(schedules.map((schedule) => schedule.id)),
    // Every Personal Message frame in one read, rather than one per card.
    getPersonalMessageCatalog(),
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
          messages: null,
          seatingGap: null,
          offersNote: false,
          foldsNote: false,
          offersPersonalMessage: false,
        };
      }

      const anchor = schedule.template;
      const resolutions = await resolveTemplatesForPreview({
        anchor,
        gifting: includesGiftButton(
          event?.eventSettings,
          schedule.scheduleTypeKey,
        ),
        tableNumbers,
        followUp: isFollowUpConfirmation(schedule, schedules),
        invitationImage,
        personalMessageCatalog,
      });

      // Preview the table variant when there is one, and let the gap line
      // account for the guests who will get the other. A failed resolution is
      // a seeding bug that will also fail the send. Fall back to the anchor so
      // the page still renders something rather than blanking the card.
      const previewOf = (resolution: typeof resolutions.withNote) =>
        resolution.success
          ? (resolution.templates.withTable ?? resolution.templates.withoutTable)
          : anchor;
      // A Personal Message family that fails to resolve is a seeding bug the
      // send would hit too; the option is hidden rather than previewing a frame
      // that cannot go out.
      const personalMessage = resolutions.personalMessage?.success
        ? previewOf(resolutions.personalMessage)
        : null;
      const messages = {
        withNote: previewOf(resolutions.withNote),
        withoutNote: previewOf(resolutions.withoutNote),
        personalMessage,
      };

      // The note axis never decides whether there is a table variant or a note
      // input, so either side answers those.
      const resolution = resolutions.withoutNote;
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
        messages,
        seatingGap,
        offersNote: resolution.success ? resolution.templates.offersNote : false,
        foldsNote: foldsNote(messages.withNote.payload.parameters),
        offersPersonalMessage: personalMessage !== null,
      };
    }),
  );

  // One chronological list. Messages and call rounds used to be two separate
  // menus, which made it impossible to see that a call sits between two
  // reminders - the ordering *is* the plan, so they share one timeline.
  resolved.sort((a, b) => comparePlanOrder(a.schedule, b.schedule));

  // A type that appears more than once (a second Confirmation round) is
  // numbered in plan order, the same order that decides which Confirmation is
  // the follow-up - so "Confirmation 2" is always the one that says so.
  const numbers = numberPlan(resolved.map(({ schedule }) => schedule));

  // Numeric rather than a month name: a date shares its line with a count, and
  // "21 August" pushed that line into an ellipsis on a 375px screen.
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
  const noDate = t('timeline.noDate');
  const formatWhen = (iso: string | null) =>
    iso ? dayMonth.format(new Date(iso)) : noDate;
  const formatWhenDetailed = (iso: string | null) =>
    iso ? `${dayMonth.format(new Date(iso))} · ${clock.format(new Date(iso))}` : noDate;

  // The list card counts down to what is ahead and dates what has passed, the
  // date slash-separated whatever the locale's own numeric form.
  const now = new Date();
  const formatListWhen = (iso: string | null) => {
    if (!iso) return noDate;
    const days = daysUntil(iso, now);
    if (days === null) {
      const parts = dayMonth.formatToParts(new Date(iso));
      const part = (type: 'day' | 'month') => parts.find((p) => p.type === type)?.value;
      return `${part('day')}/${part('month')}`;
    }
    if (days === 0) return t('timeline.today');
    if (days === 1) return t('timeline.tomorrow');
    return t('timeline.inDays', { count: days });
  };

  // A call round's place among the Event's rounds, and the size of the plan it
  // belongs to - the pane's footer says "round 2 of 2 in your package".
  const callSchedules = resolved.filter(({ schedule }) => !isMessageSchedule(schedule));
  const messageCount = resolved.length - callSchedules.length;

  // Built in plan order, which the hero reads; the timeline reorders below.
  const planItems: OutreachItem[] = resolved.map(
    ({ schedule, messages, seatingGap, offersNote, foldsNote, offersPersonalMessage }) => {
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

      const number = numbers.get(schedule.id);
      const label =
        number && number.total > 1 ? `${baseLabel} ${number.index}` : baseLabel;

      const isMessage = isMessageSchedule(schedule);
      const round = isMessage ? undefined : roundsBySchedule.get(schedule.id);

      // A call round is planned like a message but executed by a person, so it
      // reports the state of its round rather than of a send. The Owner is
      // view-only on a call plan (ADR 0004), so its pane carries no action.
      const status = timelineStatus(schedule, isMessage ? null : round?.status);

      // Before the send the audience is whoever matches the target today. Once
      // it has gone out, that live count drifts as guests answer - "Not yet
      // answered" shrinks to nothing - so a sent Schedule reports the guest
      // records it actually went to instead.
      // (A call round freezes its own list; see round.total below.)
      const targeted = filterGuestsByTarget(guests, schedule.targetStatus);
      const audienceCount =
        isMessage && status === 'sent'
          ? (sentCounts.get(schedule.id) ?? 0)
          : targeted.length;

      // Once a round has started its audience is the frozen call list, not the
      // live count, and the header line says how the round stands rather than
      // when it was planned for.
      const whenDetailed = round
        ? round.completedAt
          ? tCalls('completedOn', { date: formatWhen(round.completedAt) })
          : tCalls('startedOn', { date: formatWhen(round.createdAt) })
        : isMessage
          ? formatWhenDetailed(schedule.scheduledDate)
          : formatWhen(schedule.scheduledDate);

      return {
        id: schedule.id,
        label,
        status,
        kind: isMessage ? ('message' as const) : ('call' as const),
        typeKey: schedule.scheduleTypeKey,
        offset: offsetDays(eventDate, schedule.scheduledDate),
        undated: schedule.scheduledDate === null,
        when: formatWhen(schedule.scheduledDate),
        listWhen: formatListWhen(schedule.scheduledDate),
        whenDetailed,
        audienceCount: round ? round.total : audienceCount,
        callProgress: round
          ? {
              total: round.total,
              awaiting: round.awaiting,
              confirmed: round.confirmed,
              declined: round.declined,
              noAnswer: round.noAnswer,
            }
          : null,
        details: isMessage ? (
          <ScheduleDetailPane
            schedule={schedule}
            messages={messages}
            seatingGap={seatingGap}
            offersNote={offersNote}
            foldsNote={foldsNote}
            offersPersonalMessage={offersPersonalMessage}
            eventDate={eventDate}
            event={event}
            status={status}
            audienceCount={audienceCount}
          />
        ) : schedule.scheduledDate === null ? (
          // A call plan is always proposed a date (ADR 0029). One without has no
          // plan to show; its card already reads "No date yet".
          null
        ) : (
          <CallRoundPane
            eventId={eventId}
            state={callPaneState(status)}
            scheduledDate={schedule.scheduledDate}
            targetStatus={schedule.targetStatus}
            round={round ?? null}
            audienceCount={audienceCount}
            withoutPhone={targeted.filter((guest) => !guest.phone).length}
            position={
              callSchedules.findIndex((entry) => entry.schedule.id === schedule.id) + 1
            }
            callRounds={callSchedules.length}
            messageCount={messageCount}
          />
        ),
      };
    },
  );

  // The timeline is shown in a different order than the plan: an Undated
  // Schedule has no place on it, so the undated ones lead in a group of their
  // own (ADR 0029), still in plan order among themselves.
  const items = [
    ...planItems.filter((item) => item.undated),
    ...planItems.filter((item) => !item.undated),
  ];

  // The hero reads the plan in plan order: its stepper is progress, so what has
  // gone out comes first.
  const hero = heroModel(
    resolved.map(({ schedule, seatingGap }, index): HeroEntry => {
      const item = planItems[index];
      // A message went out when it was dispatched; a call round, when it
      // finished.
      const finishedAt = isMessageSchedule(schedule)
        ? schedule.dispatchedAt
        : (roundsBySchedule.get(schedule.id)?.completedAt ?? null);
      return {
        id: item.id,
        label: item.label,
        status: item.status,
        scheduleTypeKey: schedule.scheduleTypeKey,
        scheduledDate: schedule.scheduledDate,
        audienceCount: item.audienceCount,
        when: item.whenDetailed,
        callProgress: item.callProgress,
        finishedOn: finishedAt ? formatWhen(finishedAt) : null,
        withoutTable: seatingGap?.withoutTable ?? 0,
      };
    }),
  );

  // The header says what the plan is made of - so many messages, so many call
  // rounds - leaving out a kind the plan has none of.
  const subtitle = [
    messageCount > 0 ? t('header.messageCount', { count: messageCount }) : null,
    callSchedules.length > 0
      ? t('header.callCount', { count: callSchedules.length })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // How a WhatsApp message reaches the guest matters only while one is still
  // to go out. Once every WhatsApp Schedule has been sent, its results tab
  // answers the question with real numbers.
  const whatsappPending = resolved.some(
    ({ schedule }, index) =>
      isMessageSchedule(schedule) &&
      schedule.deliveryMethod === 'whatsapp' &&
      planItems[index].status === 'pending',
  );

  return (
    <SchedulesLayout
      items={items}
      hero={hero}
      subtitle={subtitle}
      eventId={eventId}
      eventDate={eventDate}
      deliveryInfo={whatsappPending ? <DeliveryInfoButton smsFallback={event?.smsFallbackEnabled ?? true} /> : null}
    />
  );
}
