import { createClient } from '@/lib/supabase/server';
import type { GiftRow } from '../types';

export async function getEventGifts(eventId: string): Promise<GiftRow[]> {
  try {
    const supabase = await createClient();
    const [{ data: guests }, { data: gifts }] = await Promise.all([
      supabase
        .from('guests')
        .select('id, name')
        .eq('event_id', eventId)
        .eq('rsvp_status', 'confirmed')
        .order('name'),
      supabase
        .from('gifts')
        .select('id, guest_id, guest_name, amount, payment_method, notes')
        .eq('event_id', eventId),
    ]);

    const giftsByGuestId = new Map((gifts ?? []).map((g) => [g.guest_id, g]));

    const guestRows: GiftRow[] = (guests ?? []).map((guest) => {
      const gift = giftsByGuestId.get(guest.id);
      return {
        guestId: guest.id,
        guestName: guest.name,
        giftId: gift?.id ?? null,
        amount: gift?.amount ?? null,
        paymentMethod: gift?.payment_method ?? null,
        notes: gift?.notes ?? null,
      };
    });

    const knownGuestIds = new Set((guests ?? []).map((g) => g.id));

    const standaloneGiftRows: GiftRow[] = (gifts ?? [])
      .filter((g) => g.guest_id === null)
      .map((g) => ({
        guestId: null,
        guestName: g.guest_name ?? '',
        giftId: g.id,
        amount: g.amount ?? null,
        paymentMethod: g.payment_method ?? null,
        notes: g.notes ?? null,
      }));

    const orphanedGiftRows: GiftRow[] = (gifts ?? [])
      .filter((g) => g.guest_id !== null && !knownGuestIds.has(g.guest_id))
      .map((g) => ({
        guestId: null,
        guestName: g.guest_name ?? '',
        giftId: g.id,
        amount: g.amount ?? null,
        paymentMethod: g.payment_method ?? null,
        notes: g.notes ?? null,
      }));

    return [...guestRows, ...standaloneGiftRows, ...orphanedGiftRows];
  } catch (error) {
    console.error('getEventGifts error:', error);
    return [];
  }
}
