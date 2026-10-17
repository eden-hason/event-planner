'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { OWNER_MESSAGE_KINDS, type OwnerMessageKind } from '@/features/owner-messages';
import { sendOwnerMessageNow } from '@/features/owner-messages/services';
import type { EventControlResult } from './event-controls';

/**
 * An Operator's "send now" for an Owner Message (ADR 0039). Deliberately outside
 * the once-only and 48-hour rules: it resends a failed Welcome, or welcomes an
 * Event that was paid before Owner Messages existed.
 */
export async function sendOwnerMessageNowAdmin(
  eventId: string,
  kind: OwnerMessageKind,
): Promise<EventControlResult> {
  const operatorId = await assertAdmin();
  if (!OWNER_MESSAGE_KINDS.includes(kind)) return { success: false, message: 'סוג הודעה לא מוכר' };

  const supabase = createServiceClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .maybeSingle();
  if (error) return { success: false, message: 'לא הצלחנו לטעון את האירוע' };
  if (!event) return { success: false, message: 'האירוע הזה כבר לא קיים' };
  if (event.status === 'draft') return { success: false, message: 'לאירוע בטיוטה אין למי לשלוח' };

  const result = await sendOwnerMessageNow(supabase, { eventId, kind, operatorId });
  revalidatePath(`/admin/events/${eventId}`);
  return result.success
    ? { success: true, message: 'ההודעה נשלחה' }
    : { success: false, message: result.message };
}
