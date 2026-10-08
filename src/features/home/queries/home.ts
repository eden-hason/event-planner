import { cache } from 'react';
import { getEffectiveClient, getImpersonation } from '@/lib/supabase/admin';
import { getEventById } from '@/features/events/queries';
import { getEventGuests, getEventGroupsWithGuests } from '@/features/guests/queries';
import { getEffectiveUser, getUserProfile } from '@/features/auth/queries';
import { getCollaboratorRole } from '@/features/collaborate/queries';
import { getGlobalProgressCounts } from '@/features/seating/queries';
import { findGuestIssues } from '@/features/guests';
import {
  ASK_TYPE_KEYS,
  comparePlanOrder,
  hasNoAskPlanned,
  isGiftingEnabled,
  planEntryFromRow,
} from '@/features/schedules/utils';
import { daysUntil } from '@/lib/date-time';
import { TEST_MESSAGE_CAP } from '@/features/schedules/services/send-test-message';
import type { EventApp } from '@/features/events/schemas';
import type { FeaturedActionFacts, StatusStripData } from '../types';
import { countHeads } from '../utils/counts';
import { isDetailsComplete } from '../utils/featured-actions';
import { getCollaboratorCount } from './onboarding-status';
import { getPendingSchedulesCount } from './pending-schedules';

/** A next Schedule further out than this reads better as a count of what is queued. */
const NEXT_SCHEDULE_HORIZON_DAYS = 14;

/*
 * Home renders in independent Suspense sections, several of which need the same
 * event, guest list and groups. cache() makes each of those one query per
 * request however many sections ask.
 */
export const getHomeEvent = cache(getEventById);
export const getHomeGuests = cache(getEventGuests);
export const getHomeGroups = cache(getEventGroupsWithGuests);

export type HomeViewer = {
  userId: string;
  name: string;
  phone: string | null;
  isOwner: boolean;
  /** An Operator acting as this user - allowed to look, not to send as them. */
  isImpersonated: boolean;
};

export const getHomeViewer = cache(async function getHomeViewer(
  eventId: string,
): Promise<HomeViewer | null> {
  const [user, role, impersonation, profile] = await Promise.all([
    getEffectiveUser(),
    getCollaboratorRole(eventId),
    getImpersonation(),
    getUserProfile(),
  ]);
  if (!user) return null;
  // Impersonated: getEffectiveUser already read the target's profile. Otherwise
  // it returns the auth user, whose phone is not the profile number we send to.
  return {
    userId: user.id,
    name: impersonation ? user.displayName : profile?.fullName || user.displayName,
    phone: (impersonation ? user.phone : profile?.phoneNumber) || null,
    isOwner: role?.role === 'owner',
    isImpersonated: Boolean(impersonation),
  };
});

/**
 * The earliest confirmation Schedule that has not gone out yet - the one a Test
 * Message previews. Reads through the viewer's own client, so RLS also confirms
 * the event is theirs.
 *
 * A dated one wins; with none dated it is the first Undated one in plan order,
 * the round that asks everyone (ADR 0029). The Test Message is about what the
 * message says, which an Undated Schedule already knows.
 */
export const getTestMessageSchedule = cache(async function getTestMessageSchedule(
  eventId: string,
): Promise<{ id: string } | null> {
  const { supabase } = await getEffectiveClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('id, scheduled_date, target_status, schedule_types!inner (key)')
    .eq('event_id', eventId)
    .eq('schedule_types.key', 'confirmation')
    .is('status', null);
  if (error) {
    console.error('Error fetching the test message schedule:', error);
    return null;
  }
  // An Event has a couple of Confirmations at most, so the plan order is
  // applied here rather than restated as SQL that could drift from it.
  const [first] = (data ?? []).map(planEntryFromRow).sort(comparePlanOrder);
  return first ? { id: first.id } : null;
});

async function canReceiveTestMessage(eventId: string, viewer: HomeViewer): Promise<boolean> {
  const schedule = await getTestMessageSchedule(eventId);
  if (!schedule) return false;

  const { supabase } = await getEffectiveClient();
  const { data, error } = await supabase
    .from('test_messages')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'accepted');
  if (error) {
    console.error('Error fetching test messages:', error);
    return false;
  }
  const accepted = data ?? [];
  return (
    accepted.length < TEST_MESSAGE_CAP &&
    !accepted.some((row) => row.user_id === viewer.userId)
  );
}

async function countRows(table: 'tables' | 'expenses', eventId: string): Promise<number> {
  const { supabase } = await getEffectiveClient();
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);
  if (error) {
    console.error(`Error counting ${table}:`, error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Whether a sending Event has none of its Initial Invitations or Confirmations
 * dated (ADR 0029) - nothing will ever ask its Guests anything until one is.
 * An Event that cannot send yet is not asked: it cannot date them.
 */
async function hasNoAskPlannedForEvent(event: EventApp): Promise<boolean> {
  if (!event.canCreateSchedules) return false;
  const { supabase } = await getEffectiveClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('id, scheduled_date, schedule_types!inner (key)')
    .eq('event_id', event.id)
    .in('schedule_types.key', [...ASK_TYPE_KEYS]);
  if (error) {
    console.error('Error fetching the ask plan:', error);
    return false;
  }
  return hasNoAskPlanned((data ?? []).map(planEntryFromRow));
}

export async function getFeaturedActionFacts(
  event: EventApp,
  viewer: HomeViewer,
): Promise<Omit<FeaturedActionFacts, 'recordsOverPackage'>> {
  const [
    guests,
    groups,
    collaboratorCount,
    testable,
    tableCount,
    expenseCount,
    previewToken,
    noAskPlanned,
  ] = await Promise.all([
    getHomeGuests(event.id),
    getHomeGroups(event.id),
    getCollaboratorCount(event.id),
    canReceiveTestMessage(event.id, viewer),
    countRows('tables', event.id),
    countRows('expenses', event.id),
    getPreviewToken(event.id),
    hasNoAskPlannedForEvent(event),
  ]);

  const issues = findGuestIssues(guests);

  return {
    detailsComplete: isDetailsComplete(event),
    guestRecords: guests.length,
    groupCount: groups.length,
    hasInvitationImage: Boolean(event.invitations?.imageUrl),
    collaboratorCount,
    duplicateRecords: issues.duplicateIds.size,
    noPhoneRecords: issues.noPhoneIds.size,
    canReceiveTestMessage: testable && !viewer.isImpersonated,
    confirmedHeads: countHeads(guests).confirmed,
    tableCount,
    giftingConfigured: isGiftingEnabled(event.eventSettings),
    hasPreviewToken: previewToken !== null,
    expenseCount,
    noAskPlanned,
  };
}

export const getPreviewToken = cache(async function getPreviewToken(
  eventId: string,
): Promise<string | null> {
  const { supabase } = await getEffectiveClient();
  const { data } = await supabase
    .from('events')
    .select('preview_token')
    .eq('id', eventId)
    .maybeSingle();
  return (data?.preview_token as string | undefined) ?? null;
});

export async function getStatusStrip(event: EventApp): Promise<StatusStripData> {
  const { supabase } = await getEffectiveClient();

  const [expensesResult, tableCount, progress, nextResult, pendingCount, sentResult] = await Promise.all([
    supabase.from('expenses').select('estimate').eq('event_id', event.id),
    countRows('tables', event.id),
    getGlobalProgressCounts(event.id),
    supabase
      .from('schedules')
      .select('scheduled_date, schedule_types!inner (key)')
      .eq('event_id', event.id)
      .is('status', null)
      // An Undated Schedule is not next - nothing goes out until it is dated.
      .not('scheduled_date', 'is', null)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    getPendingSchedulesCount(event.id),
    supabase
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'sent'),
  ]);

  const expenses = expensesResult.data ?? [];
  const spent = expenses.reduce((sum, row) => sum + Number(row.estimate ?? 0), 0);
  const budgetTotal = event.budget ?? null;

  const next = nextResult.data as
    | { scheduled_date: string; schedule_types: { key: string } | { key: string }[] }
    | null;
  const nextType = next
    ? Array.isArray(next.schedule_types)
      ? next.schedule_types[0]?.key
      : next.schedule_types.key
    : undefined;

  let schedule: StatusStripData['schedule'] = null;
  const nextDays = next ? Math.max(0, daysUntil(next.scheduled_date)) : null;
  if (next && nextType && nextDays !== null && nextDays <= NEXT_SCHEDULE_HORIZON_DAYS) {
    schedule = { kind: 'next', typeKey: nextType, days: nextDays };
  } else if (pendingCount > 0) {
    schedule = { kind: 'pending', count: pendingCount };
  } else if ((sentResult.count ?? 0) > 0) {
    schedule = { kind: 'allSent' };
  }

  return {
    budget: expenses.length > 0 || budgetTotal !== null ? { spent, total: budgetTotal } : null,
    seating:
      tableCount > 0
        ? {
            seated: progress?.confirmedRecordsSeated ?? 0,
            total: progress?.confirmedRecordsTotal ?? 0,
          }
        : null,
    schedule,
  };
}
