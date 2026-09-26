'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteGuests } from '@/features/guests/actions/bulk';

/** How long the Undo toast holds a delete before it is sent (ADR 0025). */
export const UNDO_WINDOW_MS = 8000;

export type PendingDelete = {
  ids: string[];
  expiresAt: number;
};

export type DeleteFailure = {
  ids: string[];
  /** Rows back on the list - fewer than `ids` when some chunks committed. */
  returned: number;
};

/**
 * A deferred hard delete (ADR 0025). `start` hides the rows at once and holds
 * the delete for the Undo window; `undo` cancels it before anything is written,
 * so the rows come back exactly as they were. When the window runs out, or the
 * Owner leaves - navigating inside the app, or closing / backgrounding the tab -
 * the delete commits. If the tab dies before the `keepalive` request lands, the
 * rows survive: nothing is lost the Owner did not see go.
 */
export function useDeferredDelete(eventId: string) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  // Hidden until the server's list drops them. Kept apart from `pending` so the
  // rows do not flash back between the commit and the revalidated props.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const [failure, setFailure] = useState<DeleteFailure | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const unhide = useCallback((ids: readonly string[]) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const commit = useCallback(async () => {
    const current = pendingRef.current;
    clearTimer();
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    const result = await deleteGuests(eventId, current.ids).catch(() => null);
    if (!result?.success) {
      // A delete runs in chunks, so a failure can come after some rows are
      // already gone. Unhiding them all is safe - the revalidated list no
      // longer has the deleted ones - but only the rest are "back".
      unhide(current.ids);
      setFailure({
        ids: current.ids,
        returned: current.ids.length - (result?.count ?? 0),
      });
    }
  }, [eventId, unhide]);

  const start = useCallback(
    (ids: readonly string[]) => {
      if (ids.length === 0) return;
      // A second delete while one is still counting down commits the first:
      // there is one Undo toast, and it speaks for the newest delete.
      if (pendingRef.current) void commit();
      const next = { ids: [...ids], expiresAt: Date.now() + UNDO_WINDOW_MS };
      pendingRef.current = next;
      setPending(next);
      setFailure(null);
      setHiddenIds((prev) => new Set([...prev, ...ids]));
      timerRef.current = setTimeout(() => void commit(), UNDO_WINDOW_MS);
    },
    [commit],
  );

  const undo = useCallback(() => {
    const current = pendingRef.current;
    clearTimer();
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    unhide(current.ids);
  }, [unhide]);

  const retry = useCallback(() => {
    if (failure) start(failure.ids);
  }, [failure, start]);

  const dismissFailure = useCallback(() => setFailure(null), []);

  // Closing or backgrounding the tab: a Server Action cannot outlive the page,
  // so the pending delete goes to the route handler with `keepalive`.
  useEffect(() => {
    const onPageHide = () => {
      const current = pendingRef.current;
      if (!current) return;
      clearTimer();
      pendingRef.current = null;
      // Cleared in state too: a page restored from the back-forward cache
      // must not come back to an Undo toast whose delete has already gone.
      setPending(null);
      void fetch(`/api/events/${eventId}/guests/delete`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: current.ids }),
      }).catch(() => {});
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [eventId]);

  // Navigating elsewhere in the app unmounts the list: commit right away. The
  // Server Action still runs after the component is gone.
  useEffect(
    () => () => {
      const current = pendingRef.current;
      if (!current) return;
      clearTimer();
      pendingRef.current = null;
      void deleteGuests(eventId, current.ids);
    },
    [eventId],
  );

  return {
    pending,
    hiddenIds,
    failure,
    start,
    undo,
    commit,
    retry,
    dismissFailure,
  };
}
