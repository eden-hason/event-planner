'use client';

import { useCallback, useState } from 'react';
import { deleteGuests } from '@/features/guests/actions/bulk';
import { useDeferredCommit, type Pending } from './use-deferred-commit';

export type PendingDelete = Pending<{ ids: string[] }>;

export type DeleteFailure = {
  ids: string[];
  /** Rows back on the list - fewer than `ids` when some chunks committed. */
  returned: number;
};

/**
 * A deferred hard delete of Guest Records (ADR 0025), on top of
 * `useDeferredCommit`. Adds the failure state the desktop Undo toast offers a
 * retry from.
 */
export function useDeferredDelete(eventId: string) {
  const [failure, setFailure] = useState<DeleteFailure | null>(null);

  const { pending, hiddenIds, start: startCommit, undo, commit } =
    useDeferredCommit<{ ids: string[] }>({
      idsOf: (d) => d.ids,
      send: async ({ ids }) => {
        const result = await deleteGuests(eventId, ids).catch(() => null);
        if (result?.success) return true;
        // A delete runs in chunks, so a failure can come after some rows are
        // already gone. Unhiding them all is safe - the revalidated list no
        // longer has the deleted ones - but only the rest are "back".
        setFailure({ ids, returned: ids.length - (result?.count ?? 0) });
        return false;
      },
      pageHideUrl: `/api/events/${eventId}/guests/delete`,
    });

  const start = useCallback(
    (ids: readonly string[]) => {
      if (ids.length === 0) return;
      setFailure(null);
      startCommit({ ids: [...ids] });
    },
    [startCommit],
  );

  const retry = useCallback(() => {
    if (failure) start(failure.ids);
  }, [failure, start]);

  const dismissFailure = useCallback(() => setFailure(null), []);

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
