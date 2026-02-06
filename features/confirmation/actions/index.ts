'use server';

import { createServiceClient } from '@/lib/supabase/service';
import {
  ConfirmationResponseSchema,
  type ConfirmationActionState,
} from '@/features/confirmation/schemas';

export async function submitConfirmationResponse(
  token: string,
  formData: FormData,
): Promise<ConfirmationActionState> {
  try {
    const supabase = createServiceClient();

    // 1. Validate the token and get delivery + guest info
    const { data: delivery, error: fetchError } = await supabase
      .from('message_deliveries')
      .select('id, guest_id, schedule_id')
      .eq('confirmation_token', token)
      .single();

    if (fetchError || !delivery) {
      return {
        success: false,
        message: 'Invalid or expired confirmation link.',
      };
    }

    // 2. Parse and validate form data
    const rawData = {
      status: formData.get('status') as string,
      guestCount: formData.has('guestCount')
        ? Number(formData.get('guestCount'))
        : undefined,
      notes: (formData.get('notes') as string) || undefined,
    };

    const validationResult = ConfirmationResponseSchema.safeParse(rawData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError?.message ?? 'Invalid response data.',
      };
    }

    const response = validationResult.data;
    const now = new Date().toISOString();

    // 3. Update guest rsvp_status
    const { error: guestError } = await supabase
      .from('guests')
      .update({ rsvp_status: response.status })
      .eq('id', delivery.guest_id);

    if (guestError) {
      console.error('Error updating guest RSVP status:', guestError);
      return {
        success: false,
        message: 'Failed to update your response. Please try again.',
      };
    }

    // 4. Update message_deliveries response_data and responded_at
    const responseData: Record<string, unknown> = {};
    if (response.status === 'confirmed') {
      responseData.guest_count = response.guestCount;
    }
    if (response.notes) {
      responseData.notes = response.notes;
    }

    const { error: deliveryError } = await supabase
      .from('message_deliveries')
      .update({
        responded_at: now,
        response_data: responseData,
      })
      .eq('id', delivery.id);

    if (deliveryError) {
      console.error('Error updating delivery response:', deliveryError);
      // Guest status was already updated, so we don't fail entirely
    }

    // 5. Insert guest_interaction record (using raw DB enum values)
    const interactionType =
      response.status === 'confirmed' ? 'rsvp_confirm' : 'rsvp_decline';

    const interactionMetadata: Record<string, unknown> = {};
    if (response.status === 'confirmed') {
      interactionMetadata.guest_count = response.guestCount;
    }
    if (response.notes) {
      interactionMetadata.notes = response.notes;
    }

    const { error: interactionError } = await supabase
      .from('guest_interactions')
      .insert({
        guest_id: delivery.guest_id,
        schedule_id: delivery.schedule_id,
        interaction_type: interactionType,
        metadata:
          Object.keys(interactionMetadata).length > 0
            ? interactionMetadata
            : null,
      });

    if (interactionError) {
      console.error('Error inserting guest interaction:', interactionError);
      // Non-critical — don't fail the response
    }

    return {
      success: true,
      message:
        response.status === 'confirmed'
          ? 'Your attendance has been confirmed!'
          : 'Your response has been recorded.',
    };
  } catch (error) {
    console.error('Submit confirmation response error:', error);
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}
