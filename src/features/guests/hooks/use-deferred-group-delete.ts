'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteGroups } from '@/features/guests/actions/groups';
import { UNDO_WINDOW_MS } from './use-deferred-delete';

export type PendingGroupDelete = {
  id: string;
  name: string;
  /** Guest records that move to "no group" while the delete is held. */
  recordCount: number;
  expiresAt: number;
};

/**
 * Deletes a group after the same Undo window as a guest delete. `start` hides
 * the group at once (its records read as unassigned meanwhile); `undo` cancels
 * before anything is written. Records are never deleted - the FK sets their
 * group to null - so leaving the page commits the delete rather than losing it.
 */
export function useDeferredGroupDelete(
  eventId: string,
  onFailed: (name: string) => void,
) {
  const [pending, setPending] = useState<PendingGroupDelete | null>(null);
  const pendingRef = useRef<PendingGroupDelete | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFailedRef = useRef(onFailed);
  useEffect(() => {
    onFailedRef.current = onFailed;
  }, [onFailed]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const commit = useCallback(async () => {
    const current = pendingRef.current;
    clearTimer();
    if (!current) return;
    pendingRef.current = null;
    const result = await deleteGroups(eventId, current.id).catch(() => null);
    // The revalidated list drops the group on success; on failure it comes back.
    setPending(null);
    if (!result?.success) onFailedRef.current(current.name);
  }, [eventId]);

  const start = useCallback(
    (group: { id: string; name: string; recordCount: number }) => {
      // A second delete while one is counting down commits the first.
      if (pendingRef.current) void commit();
      const next = { ...group, expiresAt: Date.now() + UNDO_WINDOW_MS };
      pendingRef.current = next;
      setPending(next);
      timerRef.current = setTimeout(() => void commit(), UNDO_WINDOW_MS);
    },
    [commit],
  );

  const undo = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    setPending(null);
  }, []);

  // Navigating elsewhere in the app commits right away.
  useEffect(
    () => () => {
      const current = pendingRef.current;
      if (!current) return;
      clearTimer();
      pendingRef.current = null;
      void deleteGroups(eventId, current.id);
    },
    [eventId],
  );

  return { pending, start, undo };
}
