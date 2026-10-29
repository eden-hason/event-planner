import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isOwnerMessageQuickReplyLabel,
  ownerMessageQuickReply,
  type OwnerMessageQuickReplyAction,
} from '../utils/quick-replies';
import type { OwnerMessageKind } from '../types';

const TAG = '[owner-messages]';

export type OwnerMessageQuickReplyAnswer = {
  ownerMessageId: string;
  eventId: string;
  action: OwnerMessageQuickReplyAction;
  /** The text to send back, link included. */
  body: string;
};

/**
 * The answer to an inbound message that is a tap on an Owner Message's quick
 * reply (ADR 0049), or null for anything else. A tap on a template's button
 * quotes the template message, and that wamid is on the owner_messages row, so
 * the row says which message was tapped and the label says which button. A text
 * that quotes the message with a button's label is read the same way, as some
 * WhatsApp clients send a tap like that.
 *
 * Only reads. The caller claims the inbound message and sends the answer.
 */
export async function findOwnerMessageQuickReply(
  supabase: SupabaseClient,
  quotedMessageId: string | undefined,
  label: string,
): Promise<OwnerMessageQuickReplyAnswer | null> {
  if (!quotedMessageId || !isOwnerMessageQuickReplyLabel(label)) return null;

  const { data, error } = await supabase
    .from('owner_messages')
    .select('id, event_id, kind')
    .eq('external_message_id', quotedMessageId)
    .maybeSingle();
  if (error) {
    console.error(`${TAG} Could not look up a quoted message:`, error);
    return null;
  }
  if (!data) return null;

  const row = data as { id: string; event_id: string; kind: OwnerMessageKind };
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
  const answer = ownerMessageQuickReply(row.kind, label, siteUrl);
  if (!answer) return null;

  return { ownerMessageId: row.id, eventId: row.event_id, ...answer };
}
