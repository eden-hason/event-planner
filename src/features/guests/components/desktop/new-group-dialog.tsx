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
import { useCreateGroup } from '@/features/guests/hooks/use-create-group';

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
  const { create, error, clearError, pending } = useCreateGroup(eventId);

  const close = () => {
    setName('');
    clearError();
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ids) return;
    const groupId = await create(name);
    if (!groupId) return;
    onCreated(groupId, name.trim(), ids);
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
                clearError();
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
