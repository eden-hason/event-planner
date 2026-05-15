import { SupabaseClient } from '@supabase/supabase-js';

export type GiftRecord = {
  guestName: string | null;
  amount: number | null;
  paymentMethod: string | null;
  notes: string | null;
};

export type EventSummary = {
  name: string;
  date: string;
  guestCount: number;
  gifts: GiftRecord[];
};

export async function getEventSummary(
  supabase: SupabaseClient,
  eventId: string,
): Promise<EventSummary | null> {
  try {
    const [eventResult, guestResult, giftResult] = await Promise.all([
      supabase.from('events').select('title, event_date').eq('id', eventId).single(),
      supabase.from('guests').select('amount').eq('event_id', eventId),
      supabase.from('gifts').select('guest_name, amount, payment_method, notes').eq('event_id', eventId),
    ]);

    if (eventResult.error || !eventResult.data) return null;

    return {
      name: eventResult.data.title,
      date: eventResult.data.event_date,
      guestCount: (guestResult.data ?? []).reduce((sum, g) => sum + (g.amount ?? 1), 0),
      gifts: (giftResult.data ?? []).map((g) => ({
        guestName: g.guest_name ?? null,
        amount: g.amount ?? null,
        paymentMethod: g.payment_method ?? null,
        notes: g.notes ?? null,
      })),
    };
  } catch {
    return null;
  }
}
