'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { IconDotsVertical, IconUserMinus, IconUserCog } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { removeCollaborator } from '../actions';
import { RoleBadge } from './role-badge';
import { formatScopeSummary } from '../utils';
import type { CollaboratorApp } from '../schemas';

interface CollaboratorsListProps {
  collaborators: CollaboratorApp[];
  currentUserId?: string;
  onConfigure?: (collaborator: CollaboratorApp) => void;
}

export function CollaboratorsList({
  collaborators,
  currentUserId,
  onConfigure,
}: CollaboratorsListProps) {
  const t = useTranslations('collaborate.collaboratorsList');

  const handleRemove = async (collaborator: CollaboratorApp) => {
    const promise = removeCollaborator(collaborator.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to remove collaborator.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.removing'),
      success: (data) => data.message || t('toast.removed'),
      error: (err) =>
        err instanceof Error ? err.message : t('toast.failed'),
    });
  };

  return (
    <div className="space-y-3">
      {collaborators.map((collaborator) => {
        const isCurrentUser = currentUserId === collaborator.userId;
        const initials = collaborator.fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={collaborator.id}
            className="flex items-center justify-between rounded-xl border bg-white px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                {collaborator.avatarUrl && (
                  <AvatarImage
                    src={collaborator.avatarUrl}
                    alt={collaborator.fullName}
                  />
                )}
                <AvatarFallback className="bg-blue-100 text-xs font-medium text-blue-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">
                    {collaborator.email}
                  </span>
                  {isCurrentUser && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                      {t('you')}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <RoleBadge
                    role={collaborator.role}
                    isCreator={collaborator.isCreator}
                  />
                  {collaborator.role === 'seating_manager' &&
                    (collaborator.scopeGuestCount > 0 ||
                      collaborator.scopeGroupCount > 0) && (
                      <span className="text-muted-foreground text-xs">
                        &middot;{' '}
                        {formatScopeSummary(
                          collaborator.scopeGroupCount,
                          collaborator.scopeGuestCount,
                        )}
                      </span>
                    )}
                  {collaborator.role === 'owner' && !collaborator.isCreator && (
                    <span className="text-muted-foreground text-xs">
                      &middot; {t('invitedByYou')} &middot;{' '}
                      {new Date(collaborator.createdAt).toLocaleDateString(
                        'en-US',
                        { month: 'short', day: 'numeric' },
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!collaborator.isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <IconDotsVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {onConfigure && (
                    <DropdownMenuItem
                      onClick={() => onConfigure(collaborator)}
                    >
                      <IconUserCog className="mr-2 h-4 w-4" />
                      {t('changeRole')}
                    </DropdownMenuItem>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive"
                      >
                        <IconUserMinus className="mr-2 h-4 w-4" />
                        {t('remove')}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t('removeDialog.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('removeDialog.description', { name: collaborator.fullName })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('removeDialog.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(collaborator)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('removeDialog.confirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
