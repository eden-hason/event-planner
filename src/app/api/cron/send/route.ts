import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { drainQueue } from '@/features/schedules/services/drain-queue';
import { isAuthorizedCron } from '@/lib/config/sending';

/**
 * The Worker, once a minute.
 *
 * Drains the Delivery queue across every Event at one pace. Only one runs at a
 * time - a second invocation finds the lease taken and returns immediately.
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const result = await drainQueue(supabase, { maxDurationMs: maxDuration * 1_000 });

  return NextResponse.json({ success: true, ...result });
}
