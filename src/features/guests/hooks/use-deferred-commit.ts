'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** How long the Undo toast holds a delete before it is sent (ADR 0025). */
export const UNDO_WINDOW_MS = 8000;

export type Pending<T> = T & { expiresAt: number };

interface DeferredCommitOptions<T> {
  /** The rows hidden while the commit is held. */
  idsOf: (item: T) => readonly string[];
  /** Commits through a Server Action. `false` brings the rows back. */
  send: (item: T) => Promise<boolean>;
  /**
   * Route handler that takes `{ ids }`, for the commit sent on `pagehide` - a
   * Server Action cannot be sent with `keepalive`.
   */
  pageHideUrl: string;
}

/**
 * The mechanism behind a deferred delete (ADR 0025). `start` hides the rows at
 * once and holds the commit for the Undo window; `undo` cancels it before
 * anything is written. When the window runs out, a newer `start` replaces it,
 * or the Owner leaves - navigating inside the app, or closing / backgrounding
 * the tab - the commit is sent. If the tab dies before the `keepalive` request
 * lands, the rows survive: nothing is lost the Owner did not see go.
 */
export function useDeferredCommit<T>(options: DeferredCommitOptions<T>) {
  const [pending, setPending] = useState<Pending<T> | null>(null);
  // Hidden until the server's list drops them. Kept apart from `pending` so the
  // rows do not flash back between the commit and the revalidated props.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const pendingRef = useRef<Pending<T> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Callers pass inline closures; read the latest without re-binding anything.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  /** Takes the held item, if any, so it can be sent or dropped exactly once. */
  const take = useCallback(() => {
    const current = pendingRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
    return current;
  }, []);

  const unhide = useCallback((ids: readonly string[]) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const commit = useCallback(async () => {
    const current = take();
    if (!current) return;
    setPending(null);
    const ok = await optionsRef.current.send(current);
    if (!ok) unhide(optionsRef.current.idsOf(current));
  }, [take, unhide]);

  const start = useCallback(
    (item: T) => {
      // A second delete while one is still counting down commits the first:
      // there is one Undo toast, and it speaks for the newest delete.
      if (pendingRef.current) void commit();
      const next = { ...item, expiresAt: Date.now() + UNDO_WINDOW_MS };
      pendingRef.current = next;
      setPending(next);
      const ids = optionsRef.current.idsOf(item);
      setHiddenIds((prev) => new Set([...prev, ...ids]));
      timerRef.current = setTimeout(() => void commit(), UNDO_WINDOW_MS);
    },
    [commit],
  );

  const undo = useCallback(() => {
    const current = take();
    if (!current) return;
    setPending(null);
    unhide(optionsRef.current.idsOf(current));
  }, [take, unhide]);

  // Closing or backgrounding the tab: a Server Action cannot outlive the page,
  // so the pending commit goes to the route handler with `keepalive`.
  useEffect(() => {
    const onPageHide = () => {
      const current = take();
      if (!current) return;
      // Cleared in state too: a page restored from the back-forward cache
      // must not come back to an Undo toast whose delete has already gone.
      setPending(null);
      const { pageHideUrl, idsOf } = optionsRef.current;
      void fetch(pageHideUrl, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsOf(current) }),
      }).catch(() => {});
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [take]);

  // Navigating elsewhere in the app unmounts the list: commit right away. The
  // Server Action still runs after the component is gone.
  useEffect(
    () => () => {
      const current = take();
      if (current) void optionsRef.current.send(current);
    },
    [take],
  );

  return { pending, hiddenIds, start, undo, commit };
}
