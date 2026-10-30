'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getImpersonation } from '@/lib/supabase/admin';
import { getCollaboratorAccess } from '@/features/collaborate/queries';
import { isVisitor } from '@/features/auth';
import { revalidateOutreach } from '../services/revalidate-outreach';
import { sendSelectedDeliveries } from '../services/manual-send';
import { buildCatchUpPlan } from '../services/catch-up-plan';
import { CATCH_UP_TYPE_KEYS, pickCatchUpSchedule } from '../utils/catch-up';

export type CatchUpSendState =
  | { success: true }
  | {
      success: false;
      reason: 'save-required' | 'not-allowed' | 'not-eligible' | 'send-failed';
    };

type ScheduleRow = {
  id: string;
  status: string | null;
  sent_at: string | null;
  dispatched_at: string | null;
  schedule_types: { key: string } | { key: string }[] | null;
};

/**
 * The Owner's Catch-up Send (CONTEXT.md, ADR 0050): the latest Initial
 * Invitation or Confirmation that went out, now, to one Guest Record it never
 * reached. What is still planned reaches them by itself.
 *
 * Which Schedule and whether this guest qualifies are both decided here, not
 * taken from the drawer: the plan is recomputed from the database before
 * sending, so a guest reached in between - by a co-planner, an Operator, or a
 * second press - is refused rather than sent the message twice. The send is
 * the Back Office's own manual path (same renderer, package gate and scoped
 * claim, ADR 0014), for one guest, and it goes now at any hour: the Owner
 * chose the hour, so the Send Window does not apply.
 */
export async function sendCatchUp(guestId: string): Promise<CatchUpSendState> {
  if (!z.uuid().safeParse(guestId).success)
    return { success: false, reason: 'not-allowed' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, reason: 'not-allowed' };
  // A send reaches a real person: a Visitor saves first (ADR 0028).
  if (isVisitor(user)) return { success: false, reason: 'save-required' };

  // Read through RLS as the Owner: a guest they cannot see is not theirs to message.
  const { data: guest } = await supabase
    .from('guests')
    .select('id, event_id')
    .eq('id', guestId)
    .maybeSingle();
  if (!guest) return { success: false, reason: 'not-allowed' };

  // An Operator impersonating an Owner has the Back Office's own late-guest
  // send. The access check is not one RLS can make for us: the send below
  // runs on the service-role client, which bypasses RLS.
  const [impersonation, access] = await Promise.all([
    getImpersonation(),
    getCollaboratorAccess(guest.event_id),
  ]);
  if (impersonation || !access)
    return { success: false, reason: 'not-allowed' };

  const service = createServiceClient();
  try {
    const { data: schedules, error } = await service
      .from('schedules')
      .select('id, status, sent_at, dispatched_at, schedule_types!inner(key)')
      .eq('event_id', guest.event_id)
      .in('schedule_types.key', [...CATCH_UP_TYPE_KEYS]);
    if (error) throw error;

    const schedule = pickCatchUpSchedule(
      ((schedules ?? []) as ScheduleRow[]).map((row) => {
        const type = Array.isArray(row.schedule_types)
          ? row.schedule_types[0]
          : row.schedule_types;
        return {
          id: row.id,
          typeKey: type?.key ?? '',
          status: row.status,
          sentAt: row.sent_at,
          dispatchedAt: row.dispatched_at,
        };
      }),
    );
    if (!schedule) return { success: false, reason: 'not-eligible' };

    const planned = await buildCatchUpPlan(service, schedule.id, {
      guestId,
    });
    if (
      !planned.ok ||
      !planned.plan.eligible.some((candidate) => candidate.id === guestId)
    ) {
      return { success: false, reason: 'not-eligible' };
    }

    const outcome = await sendSelectedDeliveries(service, schedule.id, [
      guestId,
    ]);
    revalidateOutreach(guest.event_id);
    return outcome.sentCount > 0
      ? { success: true }
      : { success: false, reason: 'send-failed' };
  } catch (error) {
    console.error('sendCatchUp failed:', error);
    return { success: false, reason: 'send-failed' };
  }
}
