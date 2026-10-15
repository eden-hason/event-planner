import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { pollSmsStatus } from '@/features/schedules/services/poll-sms-status';
import { isAuthorizedCron } from '@/lib/config/sending';

/**
 * The SMS status poll, every ten minutes.
 *
 * Its own cron rather than a pass of the Sweeper: it waits on a third party
 * for every SMS it checks, and the Sweeper's passes should not queue behind
 * that. Nothing in the Sweeper depends on it - the SMS Fallback never sends to
 * a Delivery that already has an SMS, whatever that SMS's status.
 *
 * `?days=N` widens the window for a one-off catch-up over older SMS (up to
 * ActiveTrail's retention); the cron itself always uses the default.
 */
export const maxDuration = 300;

const DEFAULT_DAYS = 7;
const MAX_DAYS = 120;
/** Leaves headroom under maxDuration for the last batch and the response. */
const BUDGET_MS = 240_000;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requested = Number(new URL(request.url).searchParams.get('days'));
  const days =
    Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), MAX_DAYS)
      : DEFAULT_DAYS;

  const result = await pollSmsStatus(createServiceClient(), {
    since: new Date(Date.now() - days * 86_400_000),
    budgetMs: BUDGET_MS,
  });

  console.log(
    `[poll-sms] Done over ${days} day(s): ${result.checked} checked, ` +
      `${result.delivered} delivered, ${result.failed} failed, ` +
      `${result.unknown} not yet known, ${result.errors} error(s)` +
      (result.incomplete ? ', stopped early - the rest waits for the next run' : ''),
  );

  return NextResponse.json({ success: true, days, ...result });
}
