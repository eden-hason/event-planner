import { NextResponse } from 'next/server';
import type {
  WhatsAppGroup,
  WhatsAppImportErrorReason,
  WhatsAppImportSessionView,
  WhatsAppPerson,
} from '@/features/guests/types';
import { createClient } from '@/lib/supabase/server';

/**
 * One WhatsApp import session, as the page sees it (backlog 0017). RLS limits
 * every read and delete to the Owner who started it.
 *
 * GET is polled every second or two while the session runs. DELETE ends it:
 * after the page has read the result, or as a cancel - the running session
 * notices its row is gone and unlinks the device.
 */

type Context = { params: Promise<{ eventId: string; sessionId: string }> };

export async function GET(_request: Request, context: Context) {
  const [{ eventId, sessionId }, supabase] = await Promise.all([
    context.params,
    createClient(),
  ]);
  const { data: row } = await supabase
    .from('whatsapp_import_sessions')
    .select('status, code, error, groups, contacts')
    .eq('id', sessionId)
    .eq('event_id', eventId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(toView(row), { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_request: Request, context: Context) {
  const [{ eventId, sessionId }, supabase] = await Promise.all([
    context.params,
    createClient(),
  ]);
  await supabase
    .from('whatsapp_import_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('event_id', eventId);
  return new NextResponse(null, { status: 204 });
}

function toView(row: {
  status: string;
  code: string | null;
  error: string | null;
  groups: unknown;
  contacts: unknown;
}): WhatsAppImportSessionView {
  switch (row.status) {
    case 'code':
      return { status: 'code', code: row.code ?? '' };
    case 'linked':
      return {
        status: 'linked',
        groupCount: Array.isArray(row.groups) ? row.groups.length : null,
      };
    case 'done':
      return {
        status: 'done',
        groups: (row.groups ?? []) as WhatsAppGroup[],
        contacts: (row.contacts ?? []) as WhatsAppPerson[],
      };
    case 'error':
      return { status: 'error', error: (row.error ?? 'unknown') as WhatsAppImportErrorReason };
    default:
      return { status: 'requesting' };
  }
}
