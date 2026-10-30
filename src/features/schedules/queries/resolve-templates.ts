import { getEffectiveClient } from '@/lib/supabase/admin';
import {
  loadPersonalMessageCatalog,
  loadTemplateFamily,
  pickPersonalMessageTemplates,
  pickTemplates,
  type ResolveTemplatesResult,
  type TemplateAxes,
} from '../services/resolve-reminder-templates';
import type { MessageTemplateApp } from '../schemas/message-templates';

/**
 * Every Personal Message frame, read once for a page of previews and handed to
 * each resolveTemplatesForPreview call. A failed read previews no Personal
 * Message, which also hides the option - the send would fail the same way.
 */
export async function getPersonalMessageCatalog(): Promise<MessageTemplateApp[]> {
  const { supabase } = await getEffectiveClient();
  const catalog = await loadPersonalMessageCatalog(supabase);
  return catalog.success ? catalog.candidates : [];
}

/**
 * Preview-side wrapper around the send engine's resolver.
 *
 * The preview has to run the *same* resolution the send will, or the organiser
 * approves one message and guests receive another. message_templates is
 * readable by any authenticated user, so this needs no elevated access beyond
 * the effective (impersonation-aware) client the rest of the catalog uses.
 *
 * Resolves both sides of the note axis from one read of the family, and the
 * Schedule Type's Personal Message family beside them, picked from the catalog
 * the page read once: the note and the Personal Message are typed on the
 * client, and the preview follows them before they are saved, so it needs the
 * message the send would pick either way. `personalMessage` is null when the
 * Schedule Type has no Personal Message family on the anchor's channel, or the
 * anchor is a Bespoke Template, which is also what hides the option.
 */
export async function resolveTemplatesForPreview(
  params: Omit<TemplateAxes, 'note'> & {
    anchor: MessageTemplateApp;
    personalMessageCatalog: MessageTemplateApp[];
  },
): Promise<{
  withNote: ResolveTemplatesResult;
  withoutNote: ResolveTemplatesResult;
  personalMessage: ResolveTemplatesResult | null;
}> {
  const { supabase } = await getEffectiveClient();
  const { anchor, personalMessageCatalog, ...axes } = params;

  // A Bespoke Template offers no Personal Message: the send ignores any text
  // on it (resolveTemplatesForSchedule), so the preview resolves none either.
  const personalMessage =
    anchor.eventId === null
      ? pickPersonalMessageTemplates({
          ...axes,
          candidates: personalMessageCatalog.filter(
            (row) =>
              row.scheduleTypeId === anchor.scheduleTypeId &&
              row.channel === anchor.channel &&
              row.languageCode === anchor.languageCode,
          ),
        })
      : null;

  const family = await loadTemplateFamily(supabase, anchor);
  if (!family.success) return { withNote: family, withoutNote: family, personalMessage };

  const { candidates } = family;
  return {
    withNote: pickTemplates({ ...axes, anchor, note: true, candidates }),
    withoutNote: pickTemplates({ ...axes, anchor, note: false, candidates }),
    personalMessage,
  };
}
