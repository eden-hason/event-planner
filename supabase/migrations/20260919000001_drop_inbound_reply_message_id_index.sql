-- Outbound WhatsApp is now tagged for its statuses (ADR 0019): a Confirmation
-- Conversation reply's statuses carry a conversation: tag and are recognised
-- without a lookup. The reply_message_id search this index served is gone, and
-- nothing else filters on the column, so the index is only a write cost on
-- every tap. The column itself stays - it is the wamid Meta support looks up.

drop index if exists public.whatsapp_inbound_messages_reply_message_id_idx;
