'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import {
  buildHandDeliveryMessage,
  recordHandDelivery,
  withdrawHandDelivery,
  type HandDeliveryMessage,
  type HandDeliveryResult,
} from '@/features/schedules/services/hand-delivery';
import type { EventControlResult } from './event-controls';

export type { HandDeliveryMessage } from '@/features/schedules/services/hand-delivery';

/**
 * The WhatsApp message a Hand Delivery would send (ADR 0052), fetched when the
 * Operator opens it so the text and RSVP link are this Guest's as they are now.
 */
export async function getHandDeliveryMessage(
  deliveryId: string,
): Promise<HandDeliveryResult<{ message: HandDeliveryMessage }>> {
  await assertAdmin();
  try {
    return await buildHandDeliveryMessage(createServiceClient(), deliveryId);
  } catch (error) {
    console.error('getHandDeliveryMessage failed:', error);
    return { ok: false, message: 'לא הצלחנו להכין את ההודעה' };
  }
}

/** Runs a Hand Delivery write and revalidates the Event it touched */
async function settle(
  name: string,
  write: () => Promise<HandDeliveryResult<{ eventId: string }>>,
  done: string,
  failed: string,
): Promise<EventControlResult> {
  try {
    const result = await write();
    if (!result.ok) return { success: false, message: result.message };
    revalidateOutreach(result.eventId);
    return { success: true, message: done };
  } catch (error) {
    console.error(`${name} failed:`, error);
    return { success: false, message: failed };
  }
}

/** The Operator's word that the message reached the Guest */
export async function markHandDelivered(deliveryId: string): Promise<EventControlResult> {
  const operatorId = await assertAdmin();
  return settle(
    'markHandDelivered',
    () => recordHandDelivery(createServiceClient(), deliveryId, operatorId),
    'סומן כנמסר ידנית',
    'הסימון נכשל',
  );
}

/** Takes back a Hand Delivery recorded by mistake; the Delivery is Failed again */
export async function withdrawHandDelivered(deliveryId: string): Promise<EventControlResult> {
  await assertAdmin();
  return settle(
    'withdrawHandDelivered',
    () => withdrawHandDelivery(createServiceClient(), deliveryId),
    'המסירה הידנית בוטלה',
    'הביטול נכשל',
  );
}
