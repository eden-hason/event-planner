import type { SupabaseClient } from '@supabase/supabase-js';
import { getSmsCampaignReport } from '../actions/sms';
import { SMS_NOT_DELIVERED_MESSAGE, smsOutcomeFromReport } from '../utils';

/**
 * Asks ActiveTrail what became of every recent SMS we still only know as sent.
 *
 * SMS has no delivery webhook (docs/backlog/0001-sms-delivery-visibility.md), so
 * an SMS Delivery Attempt is recorded `sent` on acceptance and would stay there
 * forever. This pulls the answer instead: each SMS is its own one-recipient
 * campaign at the provider, and its report says delivered, errored, or nothing
 * yet. Only the attempt is written - the Delivery above it is rolled up by the
 * database (ADR 0011), exactly as a WhatsApp receipt is.
 *
 * Safe to run twice and to run beside anything else: an attempt is only moved
 * while it still reads `sent`, re-checked in the write itself, and `sent` is
 * the lowest status an accepted SMS can hold, so nothing is ever moved back.
 *
 * Bounded twice over. The window (`since`) keeps an SMS the carrier never
 * answers for from being asked about forever; the time budget keeps one run
 * inside the function's maxDuration, leaving the rest for the next run.
 */

const PAGE = 500;
const CONCURRENCY = 6;

export type PollSmsStatusResult = {
  checked: number;
  delivered: number;
  failed: number;
  /** Still neither delivered nor errored at the provider - asked again next run */
  unknown: number;
  /** Report could not be read, or the write failed - asked again next run */
  errors: number;
  /** The run stopped on its time budget or a rate limit with candidates left */
  incomplete: boolean;
};

type Candidate = { id: string; external_message_id: string; sent_at: string };

export async function pollSmsStatus(
  supabase: SupabaseClient,
  options: { since: Date; budgetMs: number; now?: () => number },
): Promise<PollSmsStatusResult> {
  const now = options.now ?? Date.now;
  const deadline = now() + options.budgetMs;
  const result: PollSmsStatusResult = {
    checked: 0,
    delivered: 0,
    failed: 0,
    unknown: 0,
    errors: 0,
    incomplete: false,
  };

  // Keyset paging on sent_at: rows this run moves out of `sent` and rows it
  // leaves behind would both shift an offset.
  let cursor = options.since.toISOString();
  let stop = false;

  while (!stop) {
    const { data, error } = await supabase
      .from('message_delivery_attempts')
      .select('id, external_message_id, sent_at')
      .eq('channel', 'sms')
      .eq('status', 'sent')
      .not('external_message_id', 'is', null)
      .gt('sent_at', cursor)
      .order('sent_at', { ascending: true })
      .limit(PAGE);

    if (error) {
      console.error('[poll-sms] Could not load sent SMS attempts:', error);
      result.errors++;
      result.incomplete = true;
      break;
    }
    const page = (data ?? []) as Candidate[];
    if (page.length === 0) break;

    for (let i = 0; i < page.length; i += CONCURRENCY) {
      if (now() >= deadline) {
        result.incomplete = true;
        stop = true;
        break;
      }
      const outcomes = await Promise.all(
        page.slice(i, i + CONCURRENCY).map((candidate) => check(supabase, candidate, result)),
      );
      if (outcomes.includes('rate_limited')) {
        result.incomplete = true;
        stop = true;
        break;
      }
    }

    cursor = page[page.length - 1].sent_at;
    if (page.length < PAGE) break;
  }

  return result;
}

async function check(
  supabase: SupabaseClient,
  candidate: Candidate,
  result: PollSmsStatusResult,
): Promise<'done' | 'rate_limited'> {
  const { report, rateLimited } = await getSmsCampaignReport(candidate.external_message_id);
  if (rateLimited) {
    result.errors++;
    return 'rate_limited';
  }
  if (!report) {
    result.errors++;
    return 'done';
  }

  result.checked++;
  const outcome = smsOutcomeFromReport(report);
  if (outcome === 'unknown') {
    result.unknown++;
    return 'done';
  }

  // The report has no timestamp, so delivered_at is when we learned it.
  const update =
    outcome === 'delivered'
      ? { status: 'delivered', delivered_at: new Date().toISOString() }
      : { status: 'failed', error_message: SMS_NOT_DELIVERED_MESSAGE };

  const { error } = await supabase
    .from('message_delivery_attempts')
    .update(update)
    .eq('id', candidate.id)
    .eq('status', 'sent');
  if (error) {
    console.error('[poll-sms] Could not record outcome for attempt', candidate.id, error);
    result.errors++;
    return 'done';
  }

  if (outcome === 'delivered') result.delivered++;
  else result.failed++;
  return 'done';
}
