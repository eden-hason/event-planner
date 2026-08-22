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
 * the family's rows and picks by the two configuration axes. The anchor's own
 * requires_* flags are deliberately ignored: it is a pointer into the family,
 * and reading its flags would silently pin resolution to whichever row the
 * wizard happened to bind weeks earlier.
 *
 * Only the reminder family is authored across both axes today. A family that
 * offers no choice on an axis (an invitation has no table-number variant) is
 * resolved as if the event had that setting off, so adding axes to one family
 * never breaks another. But a family that *does* offer an axis must be complete
 * on it: a missing row there is a seeding bug, and it hard-fails rather than
 * quietly sending a near-miss. The migration's guard exists to keep that branch
 * unreachable.
 *
 * Gifting is event-level, so it selects a single row. Table numbers are
 * per-guest - the number lives on the guest's seating assignment, which is
 * routinely incomplete on the day - so both candidates come back and the caller
 * picks per guest.
 */

export type ResolvedTemplates = {
  /** Sent to guests with a seating assignment. Null when this send has no table variant. */
  withTable: MessageTemplateApp | null;
  /** Sent to everyone else, and to every guest when there is no table variant. */
  withoutTable: MessageTemplateApp;
};

export type ResolveTemplatesResult =
  | { success: true; templates: ResolvedTemplates }
  | { success: false; message: string };

export async function resolveTemplatesForEvent(params: {
  supabase: SupabaseClient;
  anchor: MessageTemplateApp;
  /** Event-level: does the copy mention gifting? */
  gifting: boolean;
  /** Event-level gate for the table-number variant. */
  tableNumbers: boolean;
}): Promise<ResolveTemplatesResult> {
  const { supabase, anchor, gifting, tableNumbers } = params;

  const family = `${anchor.key}/${anchor.channel}/${anchor.variant}/${anchor.languageCode}`;

  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('key', anchor.key)
    .eq('channel', anchor.channel)
    .eq('variant', anchor.variant)
    .eq('language_code', anchor.languageCode);

  if (error) {
    console.error(
      `[resolve-templates] Query failed for family ${family}:`,
      error,
    );
    return { success: false, message: 'Could not load message templates' };
  }

  const candidates = (data ?? []).map((row: Record<string, unknown>) =>
    MessageTemplateDbToAppSchema.parse(row),
  );

  if (candidates.length === 0) {
    console.error(`[resolve-templates] Family ${family} has no rows`);
    return {
      success: false,
      message: `No message templates found for ${family}`,
    };
  }

  // Only honour an axis the family actually offers a choice on.
  const wantGifting = gifting && candidates.some((t) => t.requiresGifting);
  const wantTable =
    tableNumbers && candidates.some((t) => t.requiresTableNumbers);

  const pick = (requiresTable: boolean) =>
    candidates.find(
      (t) =>
        t.requiresGifting === wantGifting &&
        t.requiresTableNumbers === requiresTable,
    ) ?? null;

  const withoutTable = pick(false);

  if (!withoutTable) {
    console.error(
      `[resolve-templates] No row in ${family} for gifting=${wantGifting}, tableNumbers=false`,
    );
    return {
      success: false,
      message: `No message template configured for this event's settings (${family}, gifting=${wantGifting})`,
    };
  }

  if (!wantTable) {
    return { success: true, templates: { withTable: null, withoutTable } };
  }

  const withTable = pick(true);

  if (!withTable) {
    console.error(
      `[resolve-templates] No table-number row in ${family} for gifting=${wantGifting}`,
    );
    return {
      success: false,
      message: `No table-number message template configured for this event's settings (${family}, gifting=${wantGifting})`,
    };
  }

  return { success: true, templates: { withTable, withoutTable } };
}
