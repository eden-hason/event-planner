import { getLocale, getTranslations } from 'next-intl/server';
import { IconChartBar, IconLayoutGrid } from '@tabler/icons-react';

import { type EventApp } from '@/features/events/schemas';
import { getEventGuests } from '@/features/guests/queries/guests';
import { CallPlanCard, CallRoundResultsCard } from '@/features/calls/components';
import { getCallRoundsByScheduleId } from '@/features/calls/queries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDefaultSchedulesForEventType } from '../queries/catalog';
import {
  SCHEDULE_TYPE_KEYS,
  toWhatsAppTemplate,
  type ScheduleTypeKey,
  type ScheduleApp,
  type WhatsAppTemplateApp,
} from '../schemas';
import { type OutreachItem, type OutreachNavGroup } from '../types';
import { resolveSmsBodyForPreview } from '../utils/parameter-resolvers';
import { filterGuestsByTarget, isMessageSchedule } from '../utils';
import { buildSuggestedSchedules } from '../utils/suggested-schedules';
import { ScheduleInteractionsCard } from './schedule-interactions-card';
import { ScheduleTabContent } from './schedule-tab-content';
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

  const [guests, roundsBySchedule] = await Promise.all([
    getEventGuests(eventId),
    // RLS-bound: a viewer without Owner access gets an empty map, so a call
    // plan renders as planned rather than exposing its results.
    getCallRoundsByScheduleId(eventId),
  ]);
  const canCreateSchedules = event?.canCreateSchedules ?? false;

  // Group schedules by schedule type key (multiple allowed for 'confirmation').
  // Each schedule carries its template row from the catalog join. Keyed by
  // plain string, not the closed ScheduleTypeKey union - schedule_types is a
  // DB table and can grow past the four keys known at build time.
  const schedulesByType: Partial<Record<string, ScheduleWithTemplate[]>> = {};

  for (const schedule of schedules) {
    const typeKey = schedule.scheduleTypeKey;
    if (!schedulesByType[typeKey]) {
      schedulesByType[typeKey] = [];
    }
    schedulesByType[typeKey]!.push({
      schedule,
      template: schedule.template ? toWhatsAppTemplate(schedule.template) : null,
      smsBody:
        schedule.template?.channel === 'sms'
          ? resolveSmsBodyForPreview(schedule.template.payload, event).resolvedBody
          : null,
    });
  }

  // Show every type that has actual schedules, not just the four known at
  // build time: known keys first in their canonical order, then any other
  // catalog type (e.g. one added directly to schedule_types) appended after.
  const presentTypes = Object.keys(schedulesByType);
  const visibleTypes = [
    ...SCHEDULE_TYPE_KEYS.filter((type) => schedulesByType[type]),
    ...presentTypes.filter((type) => !KNOWN_SCHEDULE_TYPE_KEYS.includes(type)).sort(),
  ];

  // The wizard shows only when there is no outreach at all. Call rounds are
  // schedules now, so an event that has only call plans is caught by this same
  // check - hiding real work behind an onboarding prompt is exactly the blind
  // spot this page exists to remove.
  if (visibleTypes.length === 0) {
    const eventType = event?.eventType ?? 'wedding';
    const defaults = await getDefaultSchedulesForEventType(eventType);
    const suggestedSchedules = buildSuggestedSchedules(defaults, eventDate);
    const invitationDefault = defaults.find(
      (d) => d.scheduleTypeKey === 'initial_invitation',
    );
    // A default can now be templateless (a call round), so the template is
    // guarded as well as the default itself.
    const invitationTemplate = invitationDefault?.template
      ? toWhatsAppTemplate(invitationDefault.template)
      : null;
    const targetCounts = {
      all: guests.length,
      pending: filterGuestsByTarget(guests, 'pending').length,
      confirmed: filterGuestsByTarget(guests, 'confirmed').length,
    };

    return (
      <SchedulesEmptyState
        eventId={eventId}
        event={event}
        suggestedSchedules={suggestedSchedules}
        invitationTemplate={invitationTemplate}
        targetCounts={targetCounts}
        canCreateSchedules={canCreateSchedules}
      />
    );
  }

  // Pre-render content for all types on the server
  const contentByType: Partial<Record<string, OutreachItem[]>> = {};

  for (const type of visibleTypes) {
    const items = schedulesByType[type]!;
    // Known types use the translated i18n label; anything else (a schedule
    // type added to the catalog outside this build's known set) falls back
    // to its own DB name so it still renders with a sensible label.
    const baseLabel = KNOWN_SCHEDULE_TYPE_KEYS.includes(type)
      ? t(`actionTypes.${type}` as `actionTypes.${ScheduleTypeKey}`)
      : items[0].schedule.scheduleTypeName;
    const multiple = items.length > 1;

    contentByType[type] = items.map(({ schedule, template, smsBody }, index) => {
      const label = multiple ? `${baseLabel} ${index + 1}` : baseLabel;

      // A call round is planned like a message but executed by a person, so it
      // reports the state of its round rather than of a send. A plan with no
      // round yet is simply pending - the same amber the nav already uses.
      if (!isMessageSchedule(schedule)) {
        const round = roundsBySchedule.get(schedule.id);
        const cancelled = schedule.status === 'cancelled';

        return {
          label,
          status: cancelled ? ('cancelled' as const) : (round?.status ?? ('pending' as const)),
          timestamp: cancelled
            ? undefined
            : round
              ? (round.completedAt ?? round.createdAt)
              : schedule.scheduledDate,
          details: round ? (
            <CallRoundResultsCard round={round} label={label} />
          ) : (
            <CallPlanCard
              scheduledDate={schedule.scheduledDate}
              scheduledTime={schedule.scheduledTime}
              targetStatus={schedule.targetStatus}
              eventDate={eventDate}
              cancelled={cancelled}
            />
          ),
        };
      }

      return {
        label,
        status: schedule.status ?? ('pending' as const),
        // A sent schedule is dated by when it went out; a still-pending one by
        // when it is due. A cancelled one has no meaningful date.
        timestamp:
          schedule.status === 'sent'
            ? (schedule.sentAt ?? undefined)
            : schedule.status === 'cancelled'
              ? undefined
              : schedule.scheduledDate,
        details: schedule.scheduleTypeKey === 'confirmation' ? (
          <Tabs defaultValue="overview" dir={locale === 'he' ? 'rtl' : 'ltr'}>
            <TabsList className="border-border mb-6 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <IconLayoutGrid size={18} />
                {t('tabs.overview')}
              </TabsTrigger>
              <TabsTrigger
                value="results"
                className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <IconChartBar size={18} />
                {t('tabs.results')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <ScheduleTabContent
                schedule={schedule}
                template={template}
                smsBody={smsBody}
                eventDate={eventDate}
                event={event}
              />
            </TabsContent>
            <TabsContent value="results">
              <ScheduleInteractionsCard scheduleId={schedule.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <ScheduleTabContent
            schedule={schedule}
            template={template}
            smsBody={smsBody}
            eventDate={eventDate}
            event={event}
          />
        ),
      };
    });
  }

  // Messages and call rounds are two different kinds of outreach, so they get
  // their own lists rather than sharing one flat menu. The split is derived
  // from each type's execution_kind, so a future non-message kind lands in the
  // right section without this code knowing its name. Only groups with
  // something in them reach the nav, so a heading never sits above an empty
  // list.
  const messageTypes = visibleTypes.filter((type) =>
    isMessageSchedule(schedulesByType[type]![0].schedule),
  );
  const callTypes = visibleTypes.filter(
    (type) => !isMessageSchedule(schedulesByType[type]![0].schedule),
  );

  const navGroups: OutreachNavGroup[] = [];
  if (messageTypes.length > 0) {
    navGroups.push({
      key: 'messages',
      label: t('nav.messages'),
      types: messageTypes,
    });
  }
  if (callTypes.length > 0) {
    navGroups.push({
      key: 'calls',
      label: t('nav.calls'),
      types: callTypes,
    });
  }

  return (
    <SchedulesLayout
      navGroups={navGroups}
      contentByType={contentByType as Record<string, OutreachItem[]>}
    />
  );
}
