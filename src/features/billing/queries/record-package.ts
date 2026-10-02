'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { loadRecordPackage, type LoadedRecordPackage } from '../services';
import { packageState } from '../utils/record-package';
import type { GuestPackageView } from '../types';

/** The current Event's Record Package and how its guest list sits against it. */
export async function getRecordPackage(eventId: string): Promise<LoadedRecordPackage | null> {
  const { supabase } = await getEffectiveClient();
  return loadRecordPackage(supabase, eventId);
}

/**
 * The package as the Guests page shows it, to the Owner and to collaborators alike.
 *
 * Read with the service client, after the viewer's own client has proven they can see the
 * event. Two things RLS would get wrong here are the reason: the payments are Owner-only
 * because they carry money, and a seating manager sees only part of the guest list - but
 * the package is counted against all of it. What leaves this function is counts and record
 * ids, never amounts. Null when the event has no package (free, payment pending).
 */
export async function getGuestPackageView(eventId: string): Promise<GuestPackageView | null> {
  const { supabase } = await getEffectiveClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (error || !event) return null;

  const loaded = await loadRecordPackage(createServiceClient(), eventId);
  if (!loaded?.package) return null;

  const { paid, bonus, size } = loaded.package;
  const { used, left, over, outside } = loaded.split;
  return {
    paid,
    bonus,
    size,
    used,
    left,
    over,
    state: packageState(size, used),
    outsideIds: outside,
  };
}
