import type { SupabaseClient } from '@supabase/supabase-js';
import { linkAnswerAttempt } from '../utils/link-answer';

/**
 * Records that a Guest answered on a Delivery's own RSVP link - proof that one
 * of the Delivery's messages reached them, whatever its provider reported
 * (Reached by Reply, ADR 0058). Sets `replied_at` on the attempt the answer is
 * credited to; the roll-up then reads the Delivery as Delivered.
 *
 * Only for the confirmation-token link: the Guest's own invitation link is not
 * tied to any message, so an answer there proves nothing about one.
 *
 * Best effort, like the WhatsApp reply proof: the answer itself is already
 * saved and matters more, so a failure here is only logged. Written once - a
 * later answer leaves the first one's time.
 */
export async function recordLinkAnswerProof(
  supabase: SupabaseClient,
  deliveryId: string,
  answeredAt: Date = new Date(),
): Promise<void> {
  const { data, error } = await supabase
    .from('message_delivery_attempts')
    .select('id, sent_at, replied_at')
    .eq('delivery_id', deliveryId)
    .not('sent_at', 'is', null);
  if (error) {
    console.error('[link-answer] Could not load the attempts of delivery', deliveryId, error);
    return;
  }

  const attempts = (data ?? []) as { id: string; sent_at: string | null; replied_at: string | null }[];
  // A reply already proved this Delivery arrived; the first proof stands.
  if (attempts.some((attempt) => attempt.replied_at)) return;

  const attempt = linkAnswerAttempt(attempts, answeredAt);
  if (!attempt) return;

  const { error: updateError } = await supabase
    .from('message_delivery_attempts')
    .update({ replied_at: answeredAt.toISOString() })
    .eq('id', attempt.id)
    .is('replied_at', null);
  if (updateError) {
    console.error('[link-answer] Could not record the answer on attempt', attempt.id, updateError);
  }
}
