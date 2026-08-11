import { getLocale, getTranslations } from 'next-intl/server';
import { IconChartBar, IconLayoutGrid } from '@tabler/icons-react';

import { type EventApp } from '@/features/events/schemas';
import { getEventGuests } from '@/features/guests/queries/guests';
import { CallRoundResultsCard } from '@/features/calls/components';
import { getCallRoundsForEvent } from '@/features/calls/queries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDefaultSchedulesForEventType } from '../queries/catalog';
import {
  SCHEDULE_TYPE_KEYS,
  toWhatsAppTemplate,
  type ScheduleTypeKey,
  type ScheduleApp,
  type WhatsAppTemplateApp,
} from '../schemas';
import { CALL_ROUNDS_NAV_KEY, type OutreachItem } from '../types';
import { resolveSmsBodyForPreview } from '../utils/parameter-resolvers';
import { filterGuestsByTarget } from '../utils';
import { buildSuggestedSchedules } from '../utils/suggested-schedules';
import { ScheduleInteractionsCard } from './schedule-interactions-card';
import { ScheduleTabContent } from './schedule-tab-content';
import { SchedulesEmptyState } from './schedules-empty-state';
import { SchedulesLayout } from './schedules-layout';

interface SchedulesPageProps {
  eventId: string;
  eventDate: string;
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
  const tCalls = await getTranslations('calls');
  const locale = await getLocale();

  const [guests, callRounds] = await Promise.all([
    getEventGuests(eventId),
    // RLS-bound: a viewer without Owner access gets an empty list, so call
    // rounds simply do not appear in their nav.
    getCallRoundsForEvent(eventId),
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

  // The wizard shows only when there is no outreach at all. An event can have
  // call rounds and no message schedules (can_create_schedules defaults to
  // false), and hiding real work behind an onboarding prompt is exactly the
  // blind spot this page exists to remove.
  if (visibleTypes.length === 0 && callRounds.length === 0) {
    const eventType = event?.eventType ?? 'wedding';
    const defaults = await getDefaultSchedulesForEventType(eventType);
    const suggestedSchedules = buildSuggestedSchedules(defaults, eventDate);
    const invitationDefault = defaults.find(
      (d) => d.scheduleTypeKey === 'initial_invitation',
    );
    const invitationTemplate = invitationDefault
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
      return {
        kind: 'message' as const,
        label: multiple ? `${baseLabel} ${index + 1}` : baseLabel,
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

  // Call rounds join the same type-keyed nav as one group after the message
  // types. Each round keeps its own number rather than a positional index -
  // deleting round 1 must not renumber round 2 under the Owner's feet.
  if (callRounds.length > 0) {
    visibleTypes.push(CALL_ROUNDS_NAV_KEY);
    contentByType[CALL_ROUNDS_NAV_KEY] = callRounds.map((round) => ({
      kind: 'call_round' as const,
      label: tCalls('round', { number: round.roundNumber }),
      status: round.status,
      timestamp: round.completedAt ?? round.createdAt,
      details: <CallRoundResultsCard round={round} />,
    }));
  }

  return (
    <SchedulesLayout
      visibleTypes={visibleTypes}
      contentByType={contentByType as Record<string, OutreachItem[]>}
    />
  );
}
