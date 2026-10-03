import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/features/auth/queries';
import { WhatsAppImportRequestSchema } from '@/features/guests/schemas';
import { runWhatsAppImport } from '@/features/guests/services/whatsapp-import';
import type { WhatsAppImportEvent } from '@/features/guests/types';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Links the Owner's WhatsApp as a short-lived device and streams back their
 * groups and contacts for the guest import (backlog 0017,
 * docs/whatsapp-import-plan.md).
 *
 * One request is the whole session: the response is newline-delimited JSON
 * (`WhatsAppImportEvent`) that stays open from the pairing code until the
 * device is unlinked again. A Route Handler rather than a Server Action
 * because it has to stream for a minute or more, and because the browser
 * closing the request is the signal to unlink.
 */
export const maxDuration = 300;

/** Leaves room under `maxDuration` for the logout to finish. */
const SESSION_DEADLINE_MS = 270_000;

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const blocked = await assertNotImpersonating();
  if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { eventId } = await context.params;
  const supabase = await createClient();
  // RLS decides whether this user may touch the Event; no row means no.
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const parsed = WhatsAppImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort());
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: WhatsAppImportEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      void runWhatsAppImport({
        phone: parsed.data.phone,
        signal: abort.signal,
        deadlineMs: SESSION_DEADLINE_MS,
        onEvent: send,
      }).finally(() => {
        try {
          controller.close();
        } catch {
          // Already closed by a cancelled reader.
        }
      });
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
