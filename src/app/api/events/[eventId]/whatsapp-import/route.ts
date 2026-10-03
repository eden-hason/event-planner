import { NextResponse, after } from 'next/server';
import { getCurrentUser } from '@/features/auth/queries';
import { WhatsAppImportRequestSchema } from '@/features/guests/schemas';
import { runWhatsAppImportSession } from '@/features/guests/services/whatsapp-import-session';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Starts a WhatsApp guest import: links the Owner's WhatsApp as a short-lived
 * device and reads their groups and contacts (backlog 0017,
 * docs/whatsapp-import-plan.md).
 *
 * Returns a session id straight away and runs the session after the response
 * (`after`), reporting into its `whatsapp_import_sessions` row. The page polls
 * `./[sessionId]` rather than holding this request open, because on a phone
 * the Owner leaves the page to enter the code in WhatsApp and the browser cuts
 * the backgrounded tab's connections.
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

  const [{ eventId }, supabase] = await Promise.all([context.params, createClient()]);
  // RLS decides whether this user may touch the Event; no row means no. The
  // lookup needs nothing from the user check, so the two run together.
  const [user, { data: event }] = await Promise.all([
    getCurrentUser(),
    supabase.from('events').select('id').eq('id', eventId).maybeSingle(),
  ]);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const { data: session, error } = await supabase
    .from('whatsapp_import_sessions')
    .insert({ event_id: eventId })
    .select('id')
    .single();
  if (error || !session) {
    console.error('[whatsapp-import] could not start a session:', error?.message);
    return NextResponse.json({ error: 'Could not start' }, { status: 500 });
  }

  after(() =>
    runWhatsAppImportSession(createServiceClient(), {
      sessionId: session.id,
      phone: parsed.data.phone,
      deadlineMs: SESSION_DEADLINE_MS,
    }),
  );

  return NextResponse.json({ sessionId: session.id });
}
