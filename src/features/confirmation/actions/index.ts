'use server';

import { createServiceClient } from '@/lib/supabase/service';
import {
  ConfirmationFormSchema,
  type ConfirmationActionState,
} from '../schemas';
import { isGuestInvitationToken } from '../queries';
import { recordGuestRsvp } from '../services/record-rsvp';
import { buildMealOptions } from '../utils/meal-options';
import {
  normalizeMealCounts,
  parseMealCounts,
  type MealCounts,
} from '../utils/meal-counts';
import { isRsvpOpen, RSVP_CLOSED_MESSAGE } from '../utils/rsvp-cutoff';

export async function submitConfirmation(
  _prevState: ConfirmationActionState | null,
  formData: FormData,
): Promise<ConfirmationActionState> {
  const raw = {
    token: formData.get('token'),
    rsvpStatus: formData.get('rsvpStatus'),
    guestCount: formData.get('guestCount') ?? undefined,
    mealCounts: formData.get('mealCounts') ?? undefined,
  };

  const parsed = ConfirmationFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'נתונים לא תקינים' };
  }

  const { token, rsvpStatus, guestCount, mealCounts } = parsed.data;

  const supabase = createServiceClient();

  // The guest, the schedule the link came through (if any), and what the page
  // needs to validate the answer against: the RSVP Cutoff and the meal types
  // the Event offers.
  const guestColumns = `id, amount, events!inner (event_date, guests_experience)`;

  let guest: {
    id: string;
    amount: number | null;
    events: {
      event_date: string | null;
      guests_experience: { dietary_options?: boolean; dietary_types?: string[] } | null;
    };
  };
  let scheduleId: string | null = null;

  if (isGuestInvitationToken(token)) {
    // Direct invitation link - look up by guests.invitation_token
    const { data, error } = await supabase
      .from('guests')
      .select(guestColumns)
      .eq('invitation_token', token)
      .single();
    if (error || !data) return { success: false, message: 'הקישור אינו תקין' };
    guest = data as unknown as typeof guest;
  } else {
    // Schedule-based confirmation link - look up by message_deliveries.confirmation_token
    const { data, error } = await supabase
      .from('message_deliveries')
      .select(`schedule_id, guests!inner (${guestColumns})`)
      .eq('confirmation_token', token)
      .single();
    if (error || !data) return { success: false, message: 'הקישור אינו תקין' };
    guest = data.guests as unknown as typeof guest;
    scheduleId = data.schedule_id;
  }

  if (!isRsvpOpen(guest.events.event_date)) {
    return { success: false, message: RSVP_CLOSED_MESSAGE };
  }

  const confirmed = rsvpStatus === 'confirmed';
  const amount = confirmed && guestCount ? guestCount : (guest.amount ?? 1);

  let meals: MealCounts = {};
  if (confirmed && mealCounts) {
    try {
      meals = normalizeMealCounts(parseMealCounts(JSON.parse(mealCounts)), {
        amount,
        allowed: buildMealOptions(
          guest.events.guests_experience
            ? {
                dietaryOptions: guest.events.guests_experience.dietary_options,
                dietaryTypes: guest.events.guests_experience.dietary_types,
              }
            : null,
        ).map((option) => option.id),
      });
    } catch {
      return { success: false, message: 'נתונים לא תקינים' };
    }
  }

  const result = await recordGuestRsvp(supabase, {
    guestId: guest.id,
    scheduleId,
    rsvpStatus,
    ...(confirmed && guestCount ? { amount: guestCount } : {}),
    mealCounts: meals,
    channel: 'page',
  });
  if (!result.ok) return { success: false, message: result.message };

  return {
    success: true,
    message: confirmed ? 'תודה! אישרת הגעה' : 'תודה על העדכון',
  };
}
