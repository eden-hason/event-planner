'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WhatsAppImportError,
  WhatsAppImportSessionView,
  WhatsAppImportState,
} from '../types';

const INITIAL: WhatsAppImportState = { status: 'idle', groups: null, contacts: null };

/** How often the session row is polled while the page is visible. */
const POLL_MS = 1_500;
/** The page gives up a little after the server's own 270s deadline. */
const CLIENT_DEADLINE_MS = 300_000;

/**
 * Drives one WhatsApp import session (backlog 0017).
 *
 * `start` asks the server to begin a session and then polls its row. The
 * session runs server-side regardless of this page: on a phone the Owner
 * switches to WhatsApp to enter the code, the browser suspends this tab, and
 * polls fail or stop - that is expected, so a failed poll is just retried,
 * and coming back to the tab polls at once to catch up.
 *
 * The row is deleted once the result is read, and on `cancel`/unmount, which
 * is also what tells a running session to unlink.
 */
export function useWhatsAppImport(eventId: string) {
  const [state, setState] = useState<WhatsAppImportState>(INITIAL);
  const sessionRef = useRef<{ id: string; stop: () => void } | null>(null);
  // Bumped by every start and cancel, so a start whose POST is still in flight
  // when the Owner cancels (or starts over) drops the session it gets back.
  const attemptRef = useRef(0);

  const sessionUrl = useCallback(
    (sessionId: string) => `/api/events/${eventId}/whatsapp-import/${sessionId}`,
    [eventId],
  );

  const endCurrent = useCallback(() => {
    attemptRef.current++;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    session.stop();
    // `keepalive` so the cancel still goes out when this runs on navigation.
    void fetch(sessionUrl(session.id), { method: 'DELETE', keepalive: true }).catch(() => {});
  }, [sessionUrl]);

  const cancel = useCallback(() => {
    endCurrent();
    setState(INITIAL);
  }, [endCurrent]);

  useEffect(() => endCurrent, [endCurrent]);

  const start = useCallback(
    async (phone: string) => {
      endCurrent();
      const attempt = attemptRef.current;
      setState({ status: 'requesting', groups: null, contacts: null });
      const fail = (error: WhatsAppImportError) =>
        setState({ status: 'error', error, groups: null, contacts: null });

      let sessionId: string;
      try {
        const response = await fetch(`/api/events/${eventId}/whatsapp-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        if (!response.ok) {
          if (attemptRef.current === attempt) {
            fail(response.status === 400 ? 'invalid_phone' : 'unknown');
          }
          return;
        }
        ({ sessionId } = (await response.json()) as { sessionId: string });
      } catch {
        if (attemptRef.current === attempt) fail('unknown');
        return;
      }
      if (attemptRef.current !== attempt) {
        void fetch(sessionUrl(sessionId), { method: 'DELETE', keepalive: true }).catch(() => {});
        return;
      }

      const startedAt = Date.now();
      let stopped = false;
      let polling = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const stop = () => {
        stopped = true;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisible);
      };
      const session = { id: sessionId, stop };
      sessionRef.current = session;

      // The session is over either way; drop its row and stop polling.
      const settle = () => {
        if (sessionRef.current === session) endCurrent();
      };

      const poll = async () => {
        if (stopped || polling) return;
        polling = true;
        clearTimeout(timer);
        let view: WhatsAppImportSessionView | null = null;
        try {
          const response = await fetch(sessionUrl(sessionId), { cache: 'no-store' });
          if (response.status === 404) {
            // The row expired or was removed under us - nothing left to wait for.
            if (!stopped) {
              settle();
              fail('unknown');
            }
            return;
          }
          if (response.ok) view = (await response.json()) as WhatsAppImportSessionView;
        } catch {
          // Expected while the tab is in the background; the next poll catches up.
        } finally {
          polling = false;
        }
        if (stopped) return;

        if (view) {
          setState(toState(view));
          if (view.status === 'done' || view.status === 'error') {
            settle();
            return;
          }
        }
        if (Date.now() - startedAt > CLIENT_DEADLINE_MS) {
          settle();
          fail('timeout');
          return;
        }
        timer = setTimeout(poll, POLL_MS);
      };

      function onVisible() {
        if (document.visibilityState === 'visible') void poll();
      }
      document.addEventListener('visibilitychange', onVisible);
      void poll();
    },
    [eventId, endCurrent, sessionUrl],
  );

  return { state, start, cancel };
}

function toState(view: WhatsAppImportSessionView): WhatsAppImportState {
  const empty = { groups: null, contacts: null };
  switch (view.status) {
    case 'requesting':
      return { ...empty, status: 'requesting' };
    case 'code':
      return { ...empty, status: 'code', code: view.code };
    case 'linked':
      return { ...empty, status: 'linked', groupCount: view.groupCount };
    case 'done':
      return { status: 'done', groups: view.groups, contacts: view.contacts };
    case 'error':
      return { ...empty, status: 'error', error: view.error };
  }
}
