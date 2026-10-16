'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  updateGroupMembers,
  upsertGroup,
  type UpsertGroupErrorCode,
} from '@/features/guests/actions/groups';

type Named = { id: string; name: string };

/**
 * Every group write the Groups tab makes, with its toast - shared by the
 * desktop panels and the phone's sheets, so a change reads the same whichever
 * surface made it. Nothing here rejects: a failure is toasted and resolves to
 * `null` / `false`, for callers that only need to know whether to go on.
 */
export function useGroupWrites(eventId: string) {
  const t = useTranslations('guests');

  const upsertError = (code?: UpsertGroupErrorCode) =>
    code === 'GROUP_NAME_TAKEN'
      ? t('toast.groupNameTaken')
      : t('toast.groupCreateFailed');

  const tracked = <T>(
    work: Promise<T>,
    loading: string,
    success: (value: T) => string,
    fallbackError: string,
  ): Promise<T | null> => {
    toast.promise(work, {
      loading,
      success,
      error: (err) => (err instanceof Error ? err.message : fallbackError),
    });
    return work.catch(() => null);
  };

  /** Moves records into a group; throws the toast's message on failure. */
  const addMembers = async (groupId: string, ids: string[]) => {
    const result = await updateGroupMembers(eventId, groupId, ids, []);
    if (!result.success) {
      throw new Error(result.message || t('groups.mobile.assignFailed'));
    }
  };

  /** Creates a group, with `preassign` records already in it. Resolves to its id. */
  const create = (formData: FormData, preassign: Named[] = []) => {
    const name = (formData.get('name') as string) || '';
    const work = upsertGroup(eventId, formData).then(async (result) => {
      if (!result.success || !result.groupId) {
        throw new Error(upsertError(result.errorCode));
      }
      if (preassign.length > 0) {
        await addMembers(result.groupId, preassign.map((g) => g.id));
      }
      return result.groupId;
    });
    return tracked(
      work,
      t('toast.creatingGroup', { name }),
      () =>
        preassign.length > 0
          ? t('groups.desktop.createdWithRecords', {
              name,
              count: preassign.length,
            })
          : t('toast.groupCreated'),
      t('toast.groupCreateFailed'),
    );
  };

  const update = (formData: FormData) => {
    const name = (formData.get('name') as string) || '';
    const work = upsertGroup(eventId, formData).then((result) => {
      if (!result.success) throw new Error(upsertError(result.errorCode));
      return true;
    });
    return tracked(
      work,
      t('groups.mobile.updatingGroup', { name }),
      () => t('groups.mobile.groupUpdated'),
      t('groups.mobile.groupUpdateFailed'),
    ).then(Boolean);
  };

  /** Saves a membership draft: `next` replaces `previous`. */
  const saveMembers = (group: Named, next: string[], previous: string[]) => {
    const work = updateGroupMembers(eventId, group.id, next, previous).then(
      (result) => {
        if (!result.success) {
          throw new Error(result.message || t('groups.assign.membersFailed'));
        }
        return true;
      },
    );
    return tracked(
      work,
      t('groups.assign.updatingMembers', { name: group.name }),
      () => t('groups.assign.membersUpdated'),
      t('groups.assign.membersFailed'),
    ).then(Boolean);
  };

  /** Adds unassigned records to a group, from a picker. */
  const assign = (records: Named[], group: Named) =>
    tracked(
      addMembers(group.id, records.map((g) => g.id)).then(() => true),
      t('groups.assign.updatingMembers', { name: group.name }),
      () =>
        records.length === 1
          ? t('groups.mobile.assignedToast', {
              name: records[0].name,
              group: group.name,
            })
          : t('groups.desktop.assignedManyToast', {
              count: records.length,
              group: group.name,
            }),
      t('groups.mobile.assignFailed'),
    ).then(Boolean);

  return { create, update, saveMembers, assign };
}
