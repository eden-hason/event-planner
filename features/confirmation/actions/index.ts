'use server';

import { createServiceClient } from '@/lib/supabase/service';
import {
  ConfirmationFormSchema,
  type ConfirmationActionState,
} from '../schemas';

export async function submitConfirmation(
  _prevState: ConfirmationActionState | null,
  formData: FormData,
): Promise<ConfirmationActionState> {
  const raw = {
    token: formData.get('token'),
    rsvpStatus: formData.get('rsvpStatus'),
    guestCount: formData.get('guestCount'),
    dietaryRestrictions: formData.get('dietaryRestrictions'),
  };

  const parsed = ConfirmationFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'נתונים לא תקינים' };
  }

  const { token, rsvpStatus, guestCount, dietaryRestrictions } = parsed.data;

  const supabase = createServiceClient();

  // Look up delivery by token
  const { data: delivery, error: lookupError } = await supabase
    .from('message_deliveries')
    .select('id, guest_id, schedule_id')
    .eq('confirmation_token', token)
    .single();

  if (lookupError || !delivery) {
    return { success: false, message: 'הקישור אינו תקין' };
  }

  // Build response_data
  const responseData: Record<string, unknown> = {};
  if (rsvpStatus === 'confirmed' && guestCount) {
    responseData.guest_count = guestCount;
  }
  if (rsvpStatus === 'confirmed' && dietaryRestrictions) {
    responseData.dietary_restrictions = dietaryRestrictions;
  }

  // Update message_deliveries
  const { error: deliveryError } = await supabase
    .from('message_deliveries')
    .update({
      responded_at: new Date().toISOString(),
      response_data: responseData,
    })
    .eq('id', delivery.id);

  if (deliveryError) {
    console.error('Error updating delivery:', deliveryError);
    return { success: false, message: 'שגיאה בשמירת התגובה' };
  }

  // Update guest record
  const guestUpdate: Record<string, unknown> = {
    rsvp_status: rsvpStatus,
  };
  if (rsvpStatus === 'confirmed' && guestCount) {
    guestUpdate.amount = guestCount;
  }
  if (rsvpStatus === 'confirmed' && dietaryRestrictions) {
    guestUpdate.dietary_restrictions = dietaryRestrictions;
  }

  const { error: guestError } = await supabase
    .from('guests')
    .update(guestUpdate)
    .eq('id', delivery.guest_id);

  if (guestError) {
    console.error('Error updating guest:', guestError);
    return { success: false, message: 'שגיאה בעדכון פרטי האורח' };
  }

  // Insert guest_interactions record
  const interactionType =
    rsvpStatus === 'confirmed' ? 'rsvp_confirm' : 'rsvp_decline';

  const metadata: Record<string, unknown> = {};
  if (guestCount) metadata.guestCount = guestCount;
  if (dietaryRestrictions) metadata.dietaryRestrictions = dietaryRestrictions;

  await supabase.from('guest_interactions').insert({
    guest_id: delivery.guest_id,
    schedule_id: delivery.schedule_id,
    interaction_type: interactionType,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  });

  return {
    success: true,
    message: rsvpStatus === 'confirmed' ? 'תודה! אישרת הגעה' : 'תודה על העדכון',
  };
}
