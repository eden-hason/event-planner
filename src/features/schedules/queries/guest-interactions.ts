'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';

export type GuestInteractionRow = {
  guestId: string;
  guestName: string;
  viewed: boolean;
  viewedAt?: string;
  response?: 'rsvp_confirm' | 'rsvp_decline';
  respondedAt?: string;
  guestCount?: number;
  mealChoice?: string;
};

export type ScheduleInteractionData = {
  summary: { views: number; confirmed: number; declined: number };
  guests: GuestInteractionRow[];
};

export async function getScheduleInteractionData(
  scheduleId: string,
): Promise<ScheduleInteractionData> {
  const { supabase } = await getEffectiveClient();

  const { data, error } = await supabase
    .from('guest_interactions')
    .select('interaction_type, created_at, metadata, guest_id, guests!inner(name)')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false });

  const empty: ScheduleInteractionData = {
    summary: { views: 0, confirmed: 0, declined: 0 },
    guests: [],
  };

  if (error || !data) {
    if (error) console.error('Error fetching schedule interaction data:', error);
    return empty;
  }

  // Aggregate per guest
  const guestMap = new Map<string, GuestInteractionRow>();

  for (const row of data) {
    const guestId = row.guest_id as string;
    const guestName = (row.guests as unknown as { name: string }).name;

    if (!guestMap.has(guestId)) {
      guestMap.set(guestId, { guestId, guestName, viewed: false });
    }

    const entry = guestMap.get(guestId)!;
    const meta = row.metadata as { guestCount?: number; mealChoice?: string } | null;

    if (row.interaction_type === 'view' && !entry.viewed) {
      entry.viewed = true;
      entry.viewedAt = row.created_at;
    } else if (
      (row.interaction_type === 'rsvp_confirm' || row.interaction_type === 'rsvp_decline') &&
      !entry.response
    ) {
      entry.response = row.interaction_type as 'rsvp_confirm' | 'rsvp_decline';
      entry.respondedAt = row.created_at;
      entry.guestCount = meta?.guestCount;
      entry.mealChoice = meta?.mealChoice;
    }
  }

  const guests = Array.from(guestMap.values());

  const summary = {
    views: guests.filter((g) => g.viewed).length,
    confirmed: guests.filter((g) => g.response === 'rsvp_confirm').length,
    declined: guests.filter((g) => g.response === 'rsvp_decline').length,
  };

  // Sort: responded first, then viewed, then no interaction
  guests.sort((a, b) => {
    const rank = (g: GuestInteractionRow) => (g.response ? 0 : g.viewed ? 1 : 2);
    return rank(a) - rank(b);
  });

  return { summary, guests };
}
