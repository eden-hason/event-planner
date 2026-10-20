import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MessageTemplateDbToAppSchema,
  type MessageTemplateApp,
} from '../schemas/message-templates';

/**
 * Resolves which template a schedule actually sends, from the event's current
 * configuration rather than from whatever was bound when the schedule was
 * created.
 *
 * `schedules.template_id` (and `event_type_default_schedules.template_id`) name
 * a *family* - key + channel + variant + language - not a message. This reads
 * the family's rows and picks by the three configuration axes (table numbers,
 * gifting, note). The anchor's own requires_* flags are deliberately ignored:
 * it is a pointer into the family, and reading its flags would silently pin
 * resolution to whichever row the wizard happened to bind weeks earlier.
 *
 * Only the reminder family is authored across these axes today. A family that
 * offers no choice on an axis (an invitation has no table-number variant) is
 * resolved as if the event had that setting off, so adding axes to one family
 * never breaks another. But a family that *does* offer an axis must be complete
 * on it: a missing row there is a seeding bug, and it hard-fails rather than
 * quietly sending a near-miss. The migration's guard exists to keep that branch
 * unreachable.
 *
 * Gifting is event-level; note and follow-up are per schedule instance. Each
 * selects a single row. Follow-up is the Confirmation round axis: a repeat
 * round says "we haven't heard from you yet" (see isFollowUpConfirmation). Table numbers are per-guest - the number lives on the guest's
 * seating assignment, which is routinely incomplete on the day - so both
 * candidates come back and the caller picks per guest.
 */

export type ResolvedTemplates = {
  /** Sent to guests with a seating assignment. Null when this send has no table variant. */
  withTable: MessageTemplateApp | null;
  /** Sent to everyone else, and to every guest when there is no table variant. */
  withoutTable: MessageTemplateApp;
  /**
   * Whether this family offers a note variant at all, regardless of whether
   * `note` was requested - callers use this to decide whether to show a
   * custom-note input for the schedule, independent of what is currently
   * typed into it.
   */
  offersNote: boolean;
};

export type ResolveTemplatesResult =
  | { success: true; templates: ResolvedTemplates }
  | { success: false; message: string };

/** The configuration axes a send is resolved on. See resolveTemplatesForEvent. */
export type TemplateAxes = {
  /** Event-level: does the copy/button mention gifting? */
  gifting: boolean;
  /** Event-level gate for the table-number variant. */
  tableNumbers: boolean;
  /**
   * Per schedule instance, not per event: whether this send should carry an
   * organiser-authored note. Defaults to false so callers that predate this
   * axis (there are none left after this change, but new ones may forget)
   * resolve exactly as they did before it existed.
   */
  note?: boolean;
  /**
   * Per schedule instance: whether this is a repeat Confirmation round. Only a
   * family that offers the axis reads it.
   */
  followUp?: boolean;
  /**
   * Event-level: whether an invitation image is uploaded to put in the header.
   * A family that offers the axis gets its text-only row without one, so a
   * send never goes to Meta missing the image its template was approved with.
   */
  invitationImage?: boolean;
};

export type LoadTemplateFamilyResult =
  | { success: true; candidates: MessageTemplateApp[] }
  | { success: false; message: string };

function familyName(anchor: MessageTemplateApp): string {
  return `${anchor.key}/${anchor.channel}/${anchor.variant}/${anchor.languageCode}`;
}

/** Every row of the anchor's family, the candidates pickTemplates chooses from. */
export async function loadTemplateFamily(
  supabase: SupabaseClient,
  anchor: MessageTemplateApp,
): Promise<LoadTemplateFamilyResult> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('key', anchor.key)
    .eq('channel', anchor.channel)
    .eq('variant', anchor.variant)
    .eq('language_code', anchor.languageCode);

  if (error) {
    console.error(
      `[resolve-templates] Query failed for family ${familyName(anchor)}:`,
      error,
    );
    return { success: false, message: 'Could not load message templates' };
  }

  return {
    success: true,
    candidates: (data ?? []).map((row: Record<string, unknown>) =>
      MessageTemplateDbToAppSchema.parse(row),
    ),
  };
}

type PickParams = TemplateAxes & {
  anchor: MessageTemplateApp;
  candidates: MessageTemplateApp[];
};

/**
 * The in-memory half of resolveTemplatesForEvent: picks from a family already
 * loaded, so a caller that needs more than one resolution of the same family
 * (the preview, with and without the note) reads it once. Logs a failure, which
 * is a seeding bug.
 */
export function pickTemplates(
  params: PickParams,
): ResolveTemplatesResult {
  const result = pick(params);
  if (!result.success) console.error(`[resolve-templates] ${result.message}`);
  return result;
}

function pick(
  params: PickParams,
): ResolveTemplatesResult {
  const {
    anchor,
    candidates,
    gifting,
    tableNumbers,
    note = false,
    followUp = false,
    invitationImage = false,
  } = params;

  const family = familyName(anchor);

  if (candidates.length === 0) {
    return {
      success: false,
      message: `No message templates found for ${family}`,
    };
  }

  // Only honour an axis the family actually offers a choice on.
  const wantGifting = gifting && candidates.some((t) => t.requiresGifting);
  const wantTable =
    tableNumbers && candidates.some((t) => t.requiresTableNumbers);
  const wantNote = note && candidates.some((t) => t.requiresNote);
  const offersNote = candidates.some((t) => t.requiresNote);
  const wantFollowUp = followUp && candidates.some((t) => t.requiresFollowUp);
  const wantImage =
    invitationImage && candidates.some((t) => t.requiresInvitationImage);

  const pickRow = (requiresTable: boolean) =>
    candidates.find(
      (t) =>
        t.requiresGifting === wantGifting &&
        t.requiresTableNumbers === requiresTable &&
        t.requiresNote === wantNote &&
        t.requiresFollowUp === wantFollowUp &&
        t.requiresInvitationImage === wantImage,
    ) ?? null;

  const withoutTable = pickRow(false);

  if (!withoutTable) {
    return {
      success: false,
      message: `No message template configured for this event's settings (${family}, gifting=${wantGifting}, note=${wantNote}, followUp=${wantFollowUp}, image=${wantImage})`,
    };
  }

  if (!wantTable) {
    return {
      success: true,
      templates: { withTable: null, withoutTable, offersNote },
    };
  }

  const withTable = pickRow(true);

  if (!withTable) {
    return {
      success: false,
      message: `No table-number message template configured for this event's settings (${family}, gifting=${wantGifting}, note=${wantNote}, followUp=${wantFollowUp}, image=${wantImage})`,
    };
  }

  return { success: true, templates: { withTable, withoutTable, offersNote } };
}

export async function resolveTemplatesForEvent(
  params: TemplateAxes & {
    supabase: SupabaseClient;
    anchor: MessageTemplateApp;
  },
): Promise<ResolveTemplatesResult> {
  const { supabase, ...axes } = params;
  const family = await loadTemplateFamily(supabase, axes.anchor);
  if (!family.success) return family;

  return pickTemplates({ ...axes, candidates: family.candidates });
}
