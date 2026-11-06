'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import {
  buildHandDeliveryMessage,
  recordHandDelivery,
  withdrawHandDelivery,
  type HandDeliveryMessage,
} from '@/features/schedules/services/hand-delivery';

export type { HandDeliveryMessage } from '@/features/schedules/services/hand-delivery';

export type HandDeliveryMessageResult =
  | { ok: true; message: HandDeliveryMessage }
  | { ok: false; message: string };

export type HandDeliveryResult = { success: boolean; message: string };

/**
 * The WhatsApp message a Hand Delivery would send (ADR 0052), fetched when the
 * Operator opens it so the text and RSVP link are this Guest's as they are now.
 */
export async function getHandDeliveryMessage(
  deliveryId: string,
): Promise<HandDeliveryMessageResult> {
  await assertAdmin();
  try {
    const result = await buildHandDeliveryMessage(createServiceClient(), deliveryId);
    return result.ok ? { ok: true, message: result.message } : result;
  } catch (error) {
    console.error('getHandDeliveryMessage failed:', error);
    return { ok: false, message: 'לא הצלחנו להכין את ההודעה' };
  }
}

/** The Operator's word that the message reached the Guest */
export async function markHandDelivered(deliveryId: string): Promise<HandDeliveryResult> {
  const operatorId = await assertAdmin();
  try {
    const result = await recordHandDelivery(createServiceClient(), deliveryId, operatorId);
    if (!result.ok) return { success: false, message: result.message };
    revalidateOutreach(result.eventId);
    return { success: true, message: 'סומן כנמסר ידנית' };
  } catch (error) {
    console.error('markHandDelivered failed:', error);
    return { success: false, message: 'הסימון נכשל' };
  }
}

/** Takes back a Hand Delivery recorded by mistake; the Delivery is Failed again */
export async function withdrawHandDelivered(deliveryId: string): Promise<HandDeliveryResult> {
  await assertAdmin();
  try {
    const result = await withdrawHandDelivery(createServiceClient(), deliveryId);
    if (!result.ok) return { success: false, message: result.message };
    revalidateOutreach(result.eventId);
    return { success: true, message: 'המסירה הידנית בוטלה' };
  } catch (error) {
    console.error('withdrawHandDelivered failed:', error);
    return { success: false, message: 'הביטול נכשל' };
  }
}
