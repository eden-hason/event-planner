'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getImpersonation } from '@/lib/supabase/admin';
import { getCollaboratorRole } from '@/features/collaborate/queries';
import { sendTestMessage } from '@/features/schedules/services/send-test-message';
import { toE164 } from '@/lib/phone';
import { getTestMessageSchedule } from '../queries';

export type SendTestMessageState =
  | { success: true; phone: string }
  | {
      success: false;
      reason: 'no-phone' | 'invalid-phone' | 'not-allowed' | 'no-schedule' | 'cap-reached' | 'send-failed';
    };

/**
 * Home's "get a test message": sends the event's next confirmation Schedule to
 * the signed-in Owner's own phone. `phoneInput` is the number typed into the
 * confirm panel by an Owner whose profile has none; it is used for this send
 * only and never written to the profile.
 */
export async function sendHomeTestMessage(
  eventId: string,
  phoneInput?: string,
): Promise<SendTestMessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, reason: 'not-allowed' };

  // An Operator impersonating an Owner can see Home, but a test goes to the
  // Owner's personal phone and spends the event's allowance. The role check is
  // not an ownership check RLS could make for us: the send below runs on the
  // service-role client, which bypasses RLS, and a Seating Manager can read
  // the event too.
  const [impersonation, role] = await Promise.all([
    getImpersonation(),
    getCollaboratorRole(eventId),
  ]);
  if (impersonation || role?.role !== 'owner') {
    return { success: false, reason: 'not-allowed' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone_number')
    .eq('id', user.id)
    .single();

  const phone = phoneInput !== undefined ? toE164(phoneInput) : (profile?.phone_number ?? null);
  if (!phone) {
    return { success: false, reason: phoneInput !== undefined ? 'invalid-phone' : 'no-phone' };
  }

  const schedule = await getTestMessageSchedule(eventId);
  if (!schedule) return { success: false, reason: 'no-schedule' };

  const name =
    profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '';

  const outcome = await sendTestMessage({
    supabase: createServiceClient(),
    scheduleId: schedule.id,
    recipient: { userId: user.id, name, phone },
  });

  if (outcome.success) return { success: true, phone: outcome.phone };
  if (outcome.reason === 'cap-reached') return { success: false, reason: 'cap-reached' };
  if (outcome.reason === 'not-found') return { success: false, reason: 'no-schedule' };
  return { success: false, reason: 'send-failed' };
}
