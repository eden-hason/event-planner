'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WhatsAppImportError,
  WhatsAppImportEvent,
  WhatsAppImportState,
} from '../types';

const INITIAL: WhatsAppImportState = { status: 'idle', groups: null, contacts: null };

/**
 * Drives one linked-device session against
 * `POST /api/events/[eventId]/whatsapp-import` and reads its NDJSON stream.
 *
 * The open request *is* the session: cancelling, starting over, or unmounting
 * aborts it, and the server unlinks the device when it sees the abort.
 */
export function useWhatsAppImport(eventId: string) {
  const [state, setState] = useState<WhatsAppImportState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(
    async (phone: string) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;
      setState({ status: 'requesting', groups: null, contacts: null });

      const fail = (error: WhatsAppImportError) => {
        if (abortRef.current === abort) setState((s) => ({ groups: s.groups, contacts: s.contacts, status: 'error', error }));
      };

      let response: Response;
      try {
        response = await fetch(`/api/events/${eventId}/whatsapp-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
          signal: abort.signal,
        });
      } catch {
        if (!abort.signal.aborted) fail('unknown');
        return;
      }
      if (!response.ok || !response.body) {
        fail(response.status === 400 ? 'invalid_phone' : 'unknown');
        return;
      }

      const apply = (event: WhatsAppImportEvent) => {
        if (abortRef.current !== abort) return;
        setState((s) => {
          const data = { groups: s.groups, contacts: s.contacts };
          switch (event.type) {
            case 'code':
              return { ...data, status: 'code', code: event.code };
            case 'linked':
            case 'done':
              return { ...data, status: event.type };
            case 'groups':
              return { ...s, groups: event.groups };
            case 'contacts':
              return { ...s, contacts: event.contacts };
            case 'error':
              return { ...data, status: 'error', error: event.reason };
          }
        });
      };

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      // Where the newline search resumes - a long `contacts` line arrives over
      // many chunks, and rescanning it from the start each time adds up.
      let scanFrom = 0;
      let ended = false;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let newline: number;
          while ((newline = buffer.indexOf('\n', scanFrom)) !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            scanFrom = 0;
            if (!line) continue;
            const event = JSON.parse(line) as WhatsAppImportEvent;
            if (event.type === 'done' || event.type === 'error') ended = true;
            apply(event);
          }
          scanFrom = buffer.length;
        }
      } catch {
        if (abort.signal.aborted) return;
      }
      // A stream that closes without `done`/`error` (function killed, network
      // drop) is a failure, not a silent stall.
      if (!ended && !abort.signal.aborted) fail('unknown');
    },
    [eventId],
  );

  return { state, start, cancel };
}
