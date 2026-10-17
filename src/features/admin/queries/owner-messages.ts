'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { OwnerMessageRow } from '@/features/owner-messages';

/** The Owner Messages band: every send and expiry for the Event, newest first. */
export async function getEventOwnerMessages(eventId: string): Promise<OwnerMessageRow[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('owner_messages')
    .select('id, kind, status, due_at, created_at, updated_at, sent_by, phone_number, error_message')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    manual: row.sent_by !== null,
    phoneNumber: row.phone_number,
    errorMessage: row.error_message,
  }));
}
