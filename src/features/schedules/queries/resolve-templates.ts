import { getEffectiveClient } from '@/lib/supabase/admin';
import {
  loadPersonalMessageFamily,
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
 * Resolves both sides of the note axis from one read of the family, and the
 * Schedule Type's Personal Message family beside them: the note and the
 * Personal Message are typed on the client, and the preview follows them before
 * they are saved, so it needs the message the send would pick either way.
 * `personalMessage` is null when the Schedule Type has no Personal Message
 * family on the anchor's channel, which is also what hides the option.
 */
export async function resolveTemplatesForPreview(
  params: Omit<TemplateAxes, 'note'> & { anchor: MessageTemplateApp },
): Promise<{
  withNote: ResolveTemplatesResult;
  withoutNote: ResolveTemplatesResult;
  personalMessage: ResolveTemplatesResult | null;
}> {
  const { supabase } = await getEffectiveClient();
  const { anchor } = params;
  const [family, personalFamily] = await Promise.all([
    loadTemplateFamily(supabase, anchor),
    loadPersonalMessageFamily(supabase, {
      scheduleTypeId: anchor.scheduleTypeId,
      channel: anchor.channel,
      languageCode: anchor.languageCode,
    }),
  ]);

  const personalAnchor = personalFamily.success ? personalFamily.candidates[0] : undefined;
  const personalMessage =
    personalFamily.success && personalAnchor
      ? pickTemplates({
          ...params,
          anchor: personalAnchor,
          candidates: personalFamily.candidates,
        })
      : null;

  if (!family.success) return { withNote: family, withoutNote: family, personalMessage };

  const { candidates } = family;
  return {
    withNote: pickTemplates({ ...params, note: true, candidates }),
    withoutNote: pickTemplates({ ...params, note: false, candidates }),
    personalMessage,
  };
}
