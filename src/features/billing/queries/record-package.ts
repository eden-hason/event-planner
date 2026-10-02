'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';
import { loadRecordPackage, type LoadedRecordPackage } from '../services';

/** The current Event's Record Package and how its guest list sits against it. */
export async function getRecordPackage(eventId: string): Promise<LoadedRecordPackage | null> {
  const { supabase } = await getEffectiveClient();
  return loadRecordPackage(supabase, eventId);
}
