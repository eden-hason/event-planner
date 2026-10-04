'use client';

import * as React from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { updateCollaboratorScope } from '../actions';
import { ScopePicker } from './scope-picker';
import type { CollaboratorApp } from '../schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

interface EditScopeDrawerProps {
  collaborator: CollaboratorApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupApp[];
  guests: GuestApp[];
  initialGroupIds: string[];
  initialGuestIds: string[];
}

export function EditScopeDrawer({
  collaborator,
  open,
  onOpenChange,
  groups,
  guests,
  initialGroupIds,
  initialGuestIds,
}: EditScopeDrawerProps) {
  const t = useTranslations('collaborate.editScope');
  const [selectedGroups, setSelectedGroups] =
    React.useState<string[]>(initialGroupIds);
  const [selectedGuests, setSelectedGuests] =
    React.useState<string[]>(initialGuestIds);
  const [isPending, setIsPending] = React.useState(false);

  // Sync when collaborator changes
  React.useEffect(() => {
    setSelectedGroups(initialGroupIds);
    setSelectedGuests(initialGuestIds);
  }, [initialGroupIds, initialGuestIds]);

  const handleSave = async () => {
    if (!collaborator) return;
    setIsPending(true);

    const formData = new FormData();
    formData.set('scopeGroups', JSON.stringify(selectedGroups));
    formData.set('scopeGuests', JSON.stringify(selectedGuests));

    try {
      const result = await updateCollaboratorScope(collaborator.id, formData);
      if (!result.success) {
        toast.error(result.message || t('toast.failed'));
        return;
      }
      toast.success(t('toast.updated'));
      onOpenChange(false);
    } catch {
      toast.error(t('toast.failed'));
    } finally {
      setIsPending(false);
    }
  };

  if (!collaborator) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader className="text-start">
          <ResponsiveDialogTitle>
            {t('title', { name: collaborator.fullName })}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('description')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="py-2">
          <ScopePicker
            groups={groups}
            guests={guests}
            selectedGroups={selectedGroups}
            selectedGuests={selectedGuests}
            onGroupsChange={setSelectedGroups}
            onGuestsChange={setSelectedGuests}
          />
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="border-t">
          <Button
            onClick={handleSave}
            disabled={
              isPending ||
              (selectedGroups.length === 0 && selectedGuests.length === 0)
            }
            className="w-full"
          >
            {isPending ? t('saving') : t('save')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
