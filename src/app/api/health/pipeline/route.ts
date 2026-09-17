import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * The Heartbeat: is the send pipeline running at all?
 *
 * Every other alarm in Kululu tells an Operator that something went wrong. This
 * one exists for the failure nobody is told about - the crons stopping. A
 * Dispatcher that never runs produces no failed Deliveries, no Signals and no
 * errors; it produces silence, and silence looks exactly like a quiet week.
 *
 * Point a free external monitor at it. It is deliberately public and carries no
 * data beyond timestamps: a monitor that needs a secret is a monitor nobody
 * sets up, and a 503 is the whole message.
 *
 * It is not a Signal and must not be rendered in the Back Office as one. A
 * Signal is something an Operator acts on within the product; this is
 * infrastructure being down, and the product cannot report on its own absence.
 */

export const dynamic = 'force-dynamic';

/** Both crons run at least once a minute, so this is many missed runs, not one. */
const STALE_AFTER_MINUTES = 15;

export async function GET() {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString();

  const { data } = await supabase
    .from('pipeline_locks')
    .select('name, heartbeat_at')
    .in('name', ['dispatcher', 'whatsapp-worker']);

  const beats = new Map(
    (data ?? []).map((row: { name: string; heartbeat_at: string | null }) => [
      row.name,
      row.heartbeat_at,
    ]),
  );
  const dispatcherAt = beats.get('dispatcher') ?? null;
  const workerAt = beats.get('whatsapp-worker') ?? null;

  // Both are required. Each cron writes its heartbeat on every run whether or
  // not it found work, so a quiet week still beats - which means a missing beat
  // really is a cron that stopped, and there is no reason to accept one side
  // covering for the other.
  const healthy =
    dispatcherAt !== null && dispatcherAt > cutoff &&
    workerAt !== null && workerAt > cutoff;

  const body = {
    healthy,
    staleAfterMinutes: STALE_AFTER_MINUTES,
    lastDispatchAt: dispatcherAt,
    lastWorkerHeartbeatAt: workerAt,
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
