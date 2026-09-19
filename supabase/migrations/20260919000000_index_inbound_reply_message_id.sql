-- The WhatsApp status webhook now looks up unmatched message ids here, to
-- recognise the statuses of Confirmation Conversation replies (ADR 0017): those
-- replies are sent inline, never have a delivery attempt, and were being
-- retried for fifteen minutes and then logged as tracking gaps.
--
-- The lookup runs on reply_message_id, which had no index, and the table gains
-- a row for every tap a guest makes. Partial, because a tap whose reply failed
-- to send has no id and is never looked up.

create index if not exists whatsapp_inbound_messages_reply_message_id_idx
  on public.whatsapp_inbound_messages (reply_message_id)
  where reply_message_id is not null;
