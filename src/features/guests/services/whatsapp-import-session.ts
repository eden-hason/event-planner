import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppImportEvent } from '../types';
import { runWhatsAppImport } from './whatsapp-import';

/**
 * Runs one WhatsApp import session and reports it into its
 * `whatsapp_import_sessions` row, which the page polls (backlog 0017).
 *
 * The session is decoupled from any browser connection on purpose: on a
 * phone the Owner leaves the page to enter the pairing code in WhatsApp, and
 * the browser cuts the backgrounded tab's connections. The row survives that;
 * the page catches up from it when the Owner comes back.
 *
 * Deleting the row is the cancel signal - the Owner going back, or the page
 * cleaning up after reading the result. The session checks for its row and
 * unlinks the device as soon as it is gone.
 *
 * Takes a service-role client: it runs after the request that started it has
 * returned, with no user session of its own, and only it updates the row.
 */

/** How often the session checks that its row still exists. */
const CANCEL_POLL_MS = 2_000;

export async function runWhatsAppImportSession(
  supabase: SupabaseClient,
  { sessionId, phone, deadlineMs }: { sessionId: string; phone: string; deadlineMs: number },
): Promise<void> {
  const abort = new AbortController();

  // Writes are chained so a slow `groups` write can never land after `done`.
  let writes = Promise.resolve();
  const write = (patch: Record<string, unknown>) => {
    writes = writes.then(async () => {
      const { error } = await supabase
        .from('whatsapp_import_sessions')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) console.error('[whatsapp-import] session write failed:', error.message);
    });
  };

  const cancelWatch = setInterval(async () => {
    const { data, error } = await supabase
      .from('whatsapp_import_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();
    if (!error && !data) abort.abort();
  }, CANCEL_POLL_MS);

  try {
    await runWhatsAppImport({
      phone,
      signal: abort.signal,
      deadlineMs,
      onEvent: (event) => write(patchFor(event)),
    });
  } finally {
    clearInterval(cancelWatch);
    await writes;
  }
}

function patchFor(event: WhatsAppImportEvent): Record<string, unknown> {
  switch (event.type) {
    case 'code':
      return { status: 'code', code: event.code };
    case 'linked':
      return { status: 'linked', code: null };
    case 'groups':
      return { groups: event.groups };
    case 'contacts':
      return { contacts: event.contacts };
    case 'done':
      return { status: 'done' };
    case 'error':
      return { status: 'error', error: event.reason, code: null };
  }
}

/** The Sweeper's pass: drop sessions nobody came back for, with whatever they read. */
export async function purgeExpiredWhatsAppImportSessions(
  supabase: SupabaseClient,
): Promise<{ purged: number }> {
  const { data, error } = await supabase
    .from('whatsapp_import_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');
  if (error) {
    console.error('[whatsapp-import] purge failed:', error.message);
    return { purged: 0 };
  }
  return { purged: data.length };
}
