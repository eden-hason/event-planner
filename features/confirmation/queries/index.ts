import { createServiceClient } from '@/lib/supabase/service';
import type { ConfirmationPageData } from '../schemas';

/**
 * Fetches confirmation page data by token using the service role client.
 * Also updates clicked_at on first visit.
 */
export async function getConfirmationDataByToken(
  token: string,
): Promise<ConfirmationPageData | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('message_deliveries')
    .select(
      `
      id,
      clicked_at,
      schedule_id,
      guests!inner (
        id, name, amount, rsvp_status, dietary_restrictions
      ),
      schedules!inner (
        id,
        events!inner (
          id, title, event_date, ceremony_time, reception_time,
          location, host_details, guests_experience, event_type
        )
      )
    `,
    )
    .eq('confirmation_token', token)
    .single();

  if (error || !data) {
    return null;
  }

  // Update clicked_at on first visit
  if (!data.clicked_at) {
    await supabase
      .from('message_deliveries')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', data.id);
  }

  // Extract nested data — Supabase returns !inner joins as objects
  const guest = data.guests as unknown as {
    id: string;
    name: string;
    amount: number;
    rsvp_status: string;
    dietary_restrictions: string | null;
  };

  const schedule = data.schedules as unknown as {
    id: string;
    events: {
      id: string;
      title: string;
      event_date: string;
      ceremony_time: string | null;
      reception_time: string | null;
      location: { name: string; coords?: { lat: number; lng: number } } | null;
      host_details: Record<string, unknown> | null;
      guests_experience: { dietary_options?: boolean } | null;
      event_type: string | null;
    };
  };

  const event = schedule.events;

  // Fetch latest RSVP interaction from guest_interactions
  const { data: interaction } = await supabase
    .from('guest_interactions')
    .select('interaction_type, created_at, metadata')
    .eq('guest_id', guest.id)
    .eq('schedule_id', data.schedule_id)
    .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const interactionMetadata = interaction?.metadata as {
    guestCount?: number;
    dietaryRestrictions?: string;
  } | null;

  return {
    deliveryId: data.id,
    respondedAt: interaction?.created_at ?? null,
    responseData: interactionMetadata
      ? {
          guestCount: interactionMetadata.guestCount,
          dietaryRestrictions: interactionMetadata.dietaryRestrictions,
        }
      : null,
    guest: {
      id: guest.id,
      name: guest.name,
      amount: guest.amount,
      rsvpStatus: guest.rsvp_status as 'pending' | 'confirmed' | 'declined',
      dietaryRestrictions: guest.dietary_restrictions ?? undefined,
    },
    event: {
      id: event.id,
      title: event.title,
      eventDate: event.event_date,
      ceremonyTime: event.ceremony_time ?? undefined,
      receptionTime: event.reception_time ?? undefined,
      location: event.location ?? undefined,
      hostDetails: event.host_details ?? undefined,
      guestExperience: event.guests_experience
        ? { dietaryOptions: event.guests_experience.dietary_options }
        : undefined,
      eventType: event.event_type ?? undefined,
    },
    scheduleId: schedule.id,
  };
}
