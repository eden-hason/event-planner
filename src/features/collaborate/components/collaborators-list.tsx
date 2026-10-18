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
import { IconDotsVertical, IconStar, IconUserMinus } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { removeCollaborator } from '../actions';
import type { CollaboratorApp } from '../schemas';

interface CollaboratorsListProps {
  collaborators: CollaboratorApp[];
  currentUserId?: string;
}

export function CollaboratorsList({
  collaborators,
  currentUserId,
}: CollaboratorsListProps) {
  const t = useTranslations('collaborate.collaboratorsList');
  const locale = useLocale();

  const handleRemove = async (collaborator: CollaboratorApp) => {
    const promise = removeCollaborator(collaborator.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to remove collaborator.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.removing'),
      success: () => t('toast.removed'),
      error: (err) =>
        err instanceof Error ? err.message : t('toast.failed'),
    });
  };

  return (
    <div className="space-y-3">
      {collaborators.map((collaborator) => {
        const isCurrentUser = currentUserId === collaborator.userId;
        const initials = collaborator.displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={collaborator.id}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4"
          >
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-10 w-10">
                {collaborator.avatarUrl && (
                  <AvatarImage
                    src={collaborator.avatarUrl}
                    alt={collaborator.displayName}
                  />
                )}
                <AvatarFallback className="bg-blue-100 text-xs font-medium text-blue-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-base font-semibold">
                    {collaborator.displayName}
                  </span>
                  {isCurrentUser && (
                    <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {t('you')}
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                  {collaborator.isCreator ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700">
                      <IconStar className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {t('creator')}
                    </span>
                  ) : (
                    <span>
                      {t('joinedOn', {
                        date: new Date(collaborator.createdAt).toLocaleDateString(
                          locale,
                          { month: 'short', day: 'numeric' },
                        ),
                      })}
                    </span>
                  )}
                  {collaborator.contact &&
                    collaborator.contact !== collaborator.displayName && (
                      <span dir="ltr" className="truncate">
                        &middot; {collaborator.contact}
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
                          {t('removeDialog.description', { name: collaborator.displayName })}
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
