'use server';

import { z } from 'zod';
import { getCurrentUser } from '@/features/auth/queries';
import { getGuestActivityInput } from '@/features/guests/queries/activity';
import {
  buildGuestActivity,
  type GuestActivityItem,
} from '@/features/guests/utils/guest-activity';

/**
 * The guest drawer's Activity, loaded after the drawer opens so opening it
 * never waits on four queries. `null` means it could not be read.
 */
export async function loadGuestActivity(
  guestId: string,
): Promise<GuestActivityItem[] | null> {
  if (!z.uuid().safeParse(guestId).success) return null;
  const user = await getCurrentUser();
  const input = await getGuestActivityInput(guestId, user?.id ?? null);
  return input ? buildGuestActivity(input) : null;
}
