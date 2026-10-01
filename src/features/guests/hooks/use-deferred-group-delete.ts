'use client';

import { deleteGroups } from '@/features/guests/actions/groups';
import { useDeferredCommit, type Pending } from './use-deferred-commit';

type GroupDeleteTarget = {
  id: string;
  name: string;
  /** Guest records that move to "no group" while the delete is held. */
  recordCount: number;
};

export type PendingGroupDelete = Pending<GroupDeleteTarget>;

/**
 * Deletes a group after the same Undo window as a guest delete, on top of
 * `useDeferredCommit`. `hiddenIds` holds the group while the delete is pending
 * (its records read as unassigned meanwhile). Records are never deleted - the
 * FK sets their group to null.
 */
export function useDeferredGroupDelete(
  eventId: string,
  onFailed: () => void,
) {
  return useDeferredCommit<GroupDeleteTarget>({
    idsOf: (group) => [group.id],
    send: async (group) => {
      const result = await deleteGroups(eventId, group.id).catch(() => null);
      if (!result?.success) onFailed();
      return Boolean(result?.success);
    },
    pageHideUrl: `/api/events/${eventId}/groups/delete`,
  });
}
