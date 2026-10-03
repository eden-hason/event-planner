'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WhatsAppGroup,
  WhatsAppImportErrorReason,
  WhatsAppImportEvent,
  WhatsAppPerson,
} from '../types';

export type WhatsAppImportStatus =
  | 'idle'
  /** Waiting for WhatsApp to hand out a pairing code. */
  | 'requesting'
  /** Code on screen, waiting for the Owner to enter it on their phone. */
  | 'code'
  /** Linked, reading groups and contacts. */
  | 'linked'
  /** Everything read; the device has already been unlinked server-side. */
  | 'done'
  | 'error';

export type WhatsAppImportError =
  | WhatsAppImportErrorReason
  | 'invalid_phone'
  /** The request itself failed or the stream ended without saying why. */
  | 'request_failed';

export interface WhatsAppImportState {
  status: WhatsAppImportStatus;
  code: string | null;
  groups: WhatsAppGroup[] | null;
  contacts: WhatsAppPerson[] | null;
  error: WhatsAppImportError | null;
}

const INITIAL: WhatsAppImportState = {
  status: 'idle',
  code: null,
  groups: null,
  contacts: null,
  error: null,
};

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
      setState({ ...INITIAL, status: 'requesting' });

      const fail = (error: WhatsAppImportError) => {
        if (abortRef.current === abort) setState((s) => ({ ...s, status: 'error', error }));
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
        if (!abort.signal.aborted) fail('request_failed');
        return;
      }
      if (!response.ok || !response.body) {
        fail(response.status === 400 ? 'invalid_phone' : 'request_failed');
        return;
      }

      const apply = (event: WhatsAppImportEvent) => {
        if (abortRef.current !== abort) return;
        setState((s) => {
          switch (event.type) {
            case 'code':
              return { ...s, status: 'code', code: event.code };
            case 'linked':
              return { ...s, status: 'linked' };
            case 'groups':
              return { ...s, groups: event.groups };
            case 'contacts':
              return { ...s, contacts: event.contacts };
            case 'done':
              return { ...s, status: 'done' };
            case 'error':
              return { ...s, status: 'error', error: event.reason };
          }
        });
      };

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let ended = false;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let newline: number;
          while ((newline = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line) continue;
            const event = JSON.parse(line) as WhatsAppImportEvent;
            if (event.type === 'done' || event.type === 'error') ended = true;
            apply(event);
          }
        }
      } catch {
        if (abort.signal.aborted) return;
      }
      // A stream that closes without `done`/`error` (function killed, network
      // drop) is a failure, not a silent stall.
      if (!ended && !abort.signal.aborted) fail('request_failed');
    },
    [eventId],
  );

  return { state, start, cancel };
}
