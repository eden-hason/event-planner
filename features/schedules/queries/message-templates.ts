import { createClient } from '@/lib/supabase/server';
import {
  MessageTemplateDbToAppSchema,
  type EventType,
  type MessageTemplateApp,
  type MessageType,
} from '../schemas';

/**
 * Fetches a message template by its ID.
 *
 * @param templateId - The template ID to fetch
 * @returns The message template in app format, or null if not found
 */
export async function getMessageTemplateById(
  templateId: string,
): Promise<MessageTemplateApp | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching message template:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return MessageTemplateDbToAppSchema.parse(data);
}

/**
 * Fetches default message templates for multiple message types and a specific event type.
 *
 * @param messageTypes - Array of message types to fetch templates for
 * @param eventType - The event type to filter by
 * @returns Map of messageType -> templateId for default templates
 */
export async function getDefaultTemplatesByMessageTypes(
  messageTypes: MessageType[],
  eventType: EventType,
): Promise<Map<MessageType, string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('message_templates')
    .select('id, message_type')
    .eq('event_type', eventType)
    .eq('is_default', true)
    .in('message_type', messageTypes);

  if (error) {
    console.error('Error fetching default templates:', error);
    throw error;
  }

  return new Map(data.map((t) => [t.message_type as MessageType, t.id]));
}
