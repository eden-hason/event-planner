import { getEffectiveClient } from '@/lib/supabase/admin';
import { resolveTemplatesForEvent } from '../services/resolve-reminder-templates';
import type { MessageTemplateApp } from '../schemas/message-templates';

/**
 * Preview-side wrapper around the send engine's resolver.
 *
 * The preview has to run the *same* resolution the send will, or the organiser
 * approves one message and guests receive another. message_templates is
 * readable by any authenticated user, so this needs no elevated access beyond
 * the effective (impersonation-aware) client the rest of the catalog uses.
 */
export async function resolveTemplatesForPreview(params: {
  anchor: MessageTemplateApp;
  gifting: boolean;
  tableNumbers: boolean;
}) {
  const { supabase } = await getEffectiveClient();
  return resolveTemplatesForEvent({ supabase, ...params });
}
