'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { upsertGroup } from '@/features/guests/actions/groups';

/**
 * "New group" from the selection bar: name it, and the selection moves into
 * it. The group is created first; moving the records is the same bulk write
 * as picking an existing group.
 */
export function NewGroupDialog({
  ids,
  eventId,
  onClose,
  onCreated,
}: {
  /** The records to move once it exists; `null` keeps the dialog closed. */
  ids: string[] | null;
  eventId: string;
  onClose: () => void;
  onCreated: (groupId: string, name: string, ids: string[]) => void;
}) {
  const t = useTranslations('guests.list.newGroup');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const close = () => {
    setName('');
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !ids) return;
    setPending(true);
    const formData = new FormData();
    formData.set('name', trimmed);
    const result = await upsertGroup(eventId, formData).catch(() => null);
    setPending(false);
    if (!result?.success || !result.groupId) {
      setError(
        result?.errorCode === 'GROUP_NAME_TAKEN' ? t('taken') : t('failed'),
      );
      return;
    }
    onCreated(result.groupId, trimmed, ids);
    close();
  };

  return (
    <Dialog open={ids !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent dir={dir} className="rounded-2xl sm:max-w-[420px]">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader className="text-start">
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('description', { count: ids?.length ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-group-name" className="text-sm font-medium">
              {t('name')}
            </label>
            <Input
              id="new-group-name"
              autoFocus
              value={name}
              maxLength={100}
              placeholder={t('placeholder')}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim() || pending}
              className="font-bold"
            >
              {t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
