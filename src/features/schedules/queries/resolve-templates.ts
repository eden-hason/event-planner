import { getEffectiveClient } from '@/lib/supabase/admin';
import {
  loadTemplateFamily,
  pickTemplates,
  type ResolveTemplatesResult,
  type TemplateAxes,
} from '../services/resolve-reminder-templates';
import type { MessageTemplateApp } from '../schemas/message-templates';

/**
 * Preview-side wrapper around the send engine's resolver.
 *
 * The preview has to run the *same* resolution the send will, or the organiser
 * approves one message and guests receive another. message_templates is
 * readable by any authenticated user, so this needs no elevated access beyond
 * the effective (impersonation-aware) client the rest of the catalog uses.
 *
 * Resolves both sides of the note axis from one read of the family: the note is
 * typed on the client, and the preview follows it before it is saved, so it
 * needs the message the send would pick either way.
 */
export async function resolveTemplatesForPreview(
  params: Omit<TemplateAxes, 'note'> & { anchor: MessageTemplateApp },
): Promise<{ withNote: ResolveTemplatesResult; withoutNote: ResolveTemplatesResult }> {
  const { supabase } = await getEffectiveClient();
  const family = await loadTemplateFamily(supabase, params.anchor);
  if (!family.success) return { withNote: family, withoutNote: family };

  const { candidates } = family;
  return {
    withNote: pickTemplates({ ...params, note: true, candidates }),
    withoutNote: pickTemplates({ ...params, note: false, candidates }),
  };
}
