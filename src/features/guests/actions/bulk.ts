'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/features/auth/queries';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { GROUP_SIDES } from '@/features/guests/schemas';
import {
  deleteGuestRecords,
  setGuestsGroup,
  setGuestsRsvp,
  setGuestsSide,
  type BulkWriteResult,
} from '@/features/guests/services/bulk-guest-writes';

export type BulkGuestsState = {
  success: boolean;
  /** Records actually written - a bulk RSVP skips the ones already at the target. */
  count: number;
  message?: string;
};

const Ids = z.array(z.uuid()).min(1).max(5000);

async function runBulk(
  eventId: string,
  ids: string[],
  write: (
    supabase: Awaited<ReturnType<typeof createClient>>,
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  ) => Promise<BulkWriteResult>,
): Promise<BulkGuestsState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, count: 0, message: blocked };
  if (!z.uuid().safeParse(eventId).success || !Ids.safeParse(ids).success) {
    return { success: false, count: 0, message: 'Invalid guest selection' };
  }
  const user = await getCurrentUser();
  if (!user)
    return { success: false, count: 0, message: 'You must be logged in' };

  const supabase = await createClient();
  const result = await write(supabase, user);
  // Revalidated even on a partial failure: earlier chunks may have landed.
  revalidatePath(`/app/${eventId}/guests`);
  return result.ok
    ? { success: true, count: result.count }
    : { success: false, count: result.count, message: 'Database error' };
}

/**
 * The commit of a deferred delete (ADR 0025). The Owner already confirmed and
 * watched the Undo toast run out; this is the point of no return.
 */
export async function deleteGuests(
  eventId: string,
  ids: string[],
): Promise<BulkGuestsState> {
  return runBulk(eventId, ids, (supabase) =>
    deleteGuestRecords(supabase, eventId, ids),
  );
}

export async function setGuestsRsvpStatus(
  eventId: string,
  ids: string[],
  status: 'confirmed' | 'pending' | 'declined',
): Promise<BulkGuestsState> {
  if (!['confirmed', 'pending', 'declined'].includes(status)) {
    return { success: false, count: 0, message: 'Invalid RSVP status' };
  }
  return runBulk(eventId, ids, (supabase, user) =>
    setGuestsRsvp(supabase, eventId, ids, status, {
      userId: user.id,
      displayName: user.displayName ?? null,
    }),
  );
}

export async function assignGuestsToGroup(
  eventId: string,
  ids: string[],
  groupId: string | null,
): Promise<BulkGuestsState> {
  if (groupId !== null && !z.uuid().safeParse(groupId).success) {
    return { success: false, count: 0, message: 'Invalid group' };
  }
  return runBulk(eventId, ids, (supabase) =>
    setGuestsGroup(supabase, eventId, ids, groupId),
  );
}

export async function setGuestsSideValue(
  eventId: string,
  ids: string[],
  side: 'bride' | 'groom' | null,
): Promise<BulkGuestsState> {
  if (side !== null && !(GROUP_SIDES as readonly string[]).includes(side)) {
    return { success: false, count: 0, message: 'Invalid side' };
  }
  return runBulk(eventId, ids, (supabase) =>
    setGuestsSide(supabase, eventId, ids, side),
  );
}
