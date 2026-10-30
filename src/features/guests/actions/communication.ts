'use server';

import { z } from 'zod';
import { getCurrentUser } from '@/features/auth/queries';
import { getGuestCommunicationInput } from '@/features/guests/queries/communication';
import {
  buildGuestCommunication,
  type GuestCommunication,
} from '@/features/guests/utils/guest-communication';

/**
 * The guest drawer's Communication tab, loaded after the tab opens so opening
 * the drawer never waits on it. `null` means it could not be read.
 */
export async function loadGuestCommunication(
  guestId: string,
): Promise<GuestCommunication | null> {
  if (!z.uuid().safeParse(guestId).success) return null;
  const user = await getCurrentUser();
  const input = await getGuestCommunicationInput(guestId, user?.id ?? null);
  return input ? buildGuestCommunication(input) : null;
}
