import { createServiceClient } from '@/lib/supabase/service';
import type { ConfirmationPageData } from '@/features/confirmation/schemas';

export async function getConfirmationByToken(
  token: string,
): Promise<ConfirmationPageData | null> {
  try {
    const supabase = createServiceClient();

    // Fetch delivery with joined guest and schedule→event data
    const { data: delivery, error } = await supabase
      .from('message_deliveries')
      .select(
        `
        id,
        schedule_id,
        responded_at,
        response_data,
        guests (
          id,
          name,
          amount,
          rsvp_status,
          events (
            id,
            title,
            description,
            event_date,
            event_type,
            ceremony_time,
            reception_time,
            location
          )
        )
      `,
      )
      .eq('confirmation_token', token)
      .single();

    if (error || !delivery) {
      return null;
    }

    // Supabase returns FK relations as objects (single) or arrays
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guest = delivery.guests as any;
    if (!guest) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = guest.events as any;
    if (!event) return null;

    // Parse location from JSONB
    const location = event.location as {
      name: string;
      coords?: { lat: number; lng: number };
    } | null;

    // Parse response_data from JSONB
    const responseData = delivery.response_data as {
      guest_count?: number;
      notes?: string;
    } | null;

    const rsvpStatus = guest.rsvp_status as
      | 'pending'
      | 'confirmed'
      | 'declined';

    // Build existing RSVP info if the guest has already responded
    const existingRsvp =
      delivery.responded_at && rsvpStatus !== 'pending'
        ? {
            status: rsvpStatus,
            guestCount: responseData?.guest_count,
            notes: responseData?.notes,
            respondedAt: delivery.responded_at as string,
          }
        : null;

    return {
      guest: {
        id: guest.id as string,
        name: guest.name as string,
        amount: (guest.amount as number) ?? 1,
      },
      event: {
        id: event.id as string,
        title: event.title as string,
        description: (event.description as string) ?? undefined,
        eventDate: event.event_date as string,
        eventType: (event.event_type as string) ?? undefined,
        ceremonyTime: (event.ceremony_time as string) ?? undefined,
        receptionTime: (event.reception_time as string) ?? undefined,
        location: location ?? undefined,
      },
      delivery: {
        id: delivery.id as string,
        scheduleId: delivery.schedule_id as string,
        respondedAt: (delivery.responded_at as string) ?? undefined,
        responseData: responseData
          ? {
              guestCount: responseData.guest_count,
              notes: responseData.notes,
            }
          : undefined,
      },
      existingRsvp,
    };
  } catch (error) {
    console.error('Error fetching confirmation by token:', error);
    return null;
  }
}
