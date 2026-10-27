import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MessageTemplateDbToAppSchema,
  type MessageChannel,
  type MessageTemplateApp,
} from '../schemas/message-templates';
import { hasPersonalMessage } from '../utils/event-config';

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

/**
 * What names a family: key + channel + variant + language. A full template row
 * satisfies it, and so does an anchor with its channel swapped for the SMS
 * Fallback.
 */
export type FamilyKey = Pick<MessageTemplateApp, 'key' | 'variant' | 'languageCode'> & {
  channel: MessageChannel;
};

function familyName(family: FamilyKey): string {
  return `${family.key}/${family.channel}/${family.variant}/${family.languageCode}`;
}

/** The one catalog read both kinds of family go through. */
async function loadFamily(
  supabase: SupabaseClient,
  filters: Record<string, string | boolean>,
  label: string,
): Promise<LoadTemplateFamilyResult> {
  let query = supabase.from('message_templates').select('*');
  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }
  const { data, error } = await query;

  if (error) {
    console.error(`[resolve-templates] Query failed for ${label}:`, error);
    return { success: false, message: 'Could not load message templates' };
  }

  return {
    success: true,
    candidates: (data ?? []).map((row: Record<string, unknown>) =>
      MessageTemplateDbToAppSchema.parse(row),
    ),
  };
}

/** Every row of the anchor's family, the candidates pickTemplates chooses from. */
export function loadTemplateFamily(
  supabase: SupabaseClient,
  family: FamilyKey,
): Promise<LoadTemplateFamilyResult> {
  return loadFamily(
    supabase,
    {
      key: family.key,
      channel: family.channel,
      variant: family.variant,
      language_code: family.languageCode,
    },
    `family ${familyName(family)}`,
  );
}

/**
 * Every row of a Schedule Type's Personal Message family on one channel (ADR
 * 0046). Found by schedule type rather than by key: the frame is the same
 * whichever Variant the Schedule is anchored on, so there is one family per
 * Schedule Type, not one per Variant family.
 */
export function loadPersonalMessageFamily(
  supabase: SupabaseClient,
  params: { scheduleTypeId: string; channel: MessageChannel; languageCode: string },
): Promise<LoadTemplateFamilyResult> {
  return loadFamily(
    supabase,
    {
      personal_message: true,
      schedule_type_id: params.scheduleTypeId,
      channel: params.channel,
      language_code: params.languageCode,
    },
    `Personal Message family ${params.scheduleTypeId}/${params.channel}/${params.languageCode}`,
  );
}

/**
 * Every Personal Message frame in the catalog, for a page that previews many
 * Schedules: one read, filtered in memory, instead of one per Schedule.
 */
export function loadPersonalMessageCatalog(
  supabase: SupabaseClient,
): Promise<LoadTemplateFamilyResult> {
  return loadFamily(supabase, { personal_message: true }, 'Personal Message catalog');
}

type PickParams = TemplateAxes & {
  anchor: FamilyKey;
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
    anchor: FamilyKey;
  },
): Promise<ResolveTemplatesResult> {
  const { supabase, ...axes } = params;
  const family = await loadTemplateFamily(supabase, axes.anchor);
  if (!family.success) return family;

  return pickTemplates({ ...axes, candidates: family.candidates });
}

/**
 * Picks from a Schedule Type's Personal Message family already loaded, or null
 * when the type has none - the preview hides the option then, and the send
 * fails. The family's first row stands in as its anchor: every row shares the
 * key, channel, variant and language that name it.
 */
export function pickPersonalMessageTemplates(
  params: TemplateAxes & { candidates: MessageTemplateApp[] },
): ResolveTemplatesResult | null {
  const [anchor] = params.candidates;
  return anchor ? pickTemplates({ ...params, anchor }) : null;
}

/**
 * What a Schedule sends: its Schedule Type's Personal Message family when it
 * carries Personal Message text, its anchor's family otherwise. A blank
 * Personal Message is no Personal Message - the Variant goes.
 *
 * `channel` defaults to the anchor's own; the SMS Fallback passes 'sms' to get
 * the same family's SMS Renditions. A Schedule with Personal Message text and
 * no family to send it is a seeding bug, and fails rather than quietly sending
 * the Variant the Owner chose not to.
 */
export async function resolveTemplatesForSchedule(
  params: TemplateAxes & {
    supabase: SupabaseClient;
    anchor: MessageTemplateApp;
    personalMessage: string | null | undefined;
    channel?: MessageChannel;
  },
): Promise<ResolveTemplatesResult> {
  const { supabase, anchor, personalMessage, channel = anchor.channel, ...axes } = params;

  if (!hasPersonalMessage(personalMessage)) {
    return resolveTemplatesForEvent({ supabase, ...axes, anchor: { ...anchor, channel } });
  }

  const scope = {
    scheduleTypeId: anchor.scheduleTypeId,
    channel,
    languageCode: anchor.languageCode,
  };
  const family = await loadPersonalMessageFamily(supabase, scope);
  if (!family.success) return family;

  const resolution = pickPersonalMessageTemplates({ ...axes, candidates: family.candidates });
  if (resolution) return resolution;

  const message = `No Personal Message templates for schedule type ${scope.scheduleTypeId} (${scope.channel}/${scope.languageCode})`;
  console.error(`[resolve-templates] ${message}`);
  return { success: false, message };
}
