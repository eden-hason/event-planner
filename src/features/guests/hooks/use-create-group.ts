'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { upsertGroup } from '@/features/guests/actions/groups';

/**
 * Creating a group by name from the guest list - the desktop "New group"
 * dialog and the phone's group sheet. Resolves to the new group's id, or
 * `null` with `error` set to a message the form can show.
 */
export function useCreateGroup(eventId: string) {
  const t = useTranslations('guests.list.newGroup');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const create = async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    setPending(true);
    const formData = new FormData();
    formData.set('name', trimmed);
    const result = await upsertGroup(eventId, formData).catch(() => null);
    setPending(false);
    if (!result?.success || !result.groupId) {
      setError(
        result?.errorCode === 'GROUP_NAME_TAKEN' ? t('taken') : t('failed'),
      );
      return null;
    }
    return result.groupId;
  };

  return { create, error, clearError: () => setError(null), pending };
}
