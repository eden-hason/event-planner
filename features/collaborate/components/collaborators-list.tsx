'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { IconDots, IconTrash, IconEye } from '@tabler/icons-react';
import { toast } from 'sonner';
import { removeCollaborator } from '../actions';
import { RoleBadge } from './role-badge';
import { ScopeSummary } from './scope-summary';
import type { CollaboratorApp } from '../schemas';

interface CollaboratorsListProps {
  collaborators: CollaboratorApp[];
  onEditScope?: (collaborator: CollaboratorApp) => void;
}

export function CollaboratorsList({
  collaborators,
  onEditScope,
}: CollaboratorsListProps) {
  const handleRemove = async (collaborator: CollaboratorApp) => {
    const promise = removeCollaborator(collaborator.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to remove collaborator.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: 'Removing collaborator...',
      success: (data) => data.message || 'Collaborator removed.',
      error: (err) =>
        err instanceof Error ? err.message : 'Something went wrong.',
    });
  };

  return (
    <div className="space-y-3">
      {collaborators.map((collaborator) => (
        <Card key={collaborator.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {collaborator.avatarUrl && (
                  <AvatarImage
                    src={collaborator.avatarUrl}
                    alt={collaborator.fullName}
                  />
                )}
                <AvatarFallback>
                  {collaborator.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {collaborator.fullName}
                  </span>
                  <RoleBadge
                    role={collaborator.role}
                    isCreator={collaborator.isCreator}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {collaborator.email}
                </p>
                {collaborator.role === 'seating_manager' && (
                  <div className="mt-1">
                    <ScopeSummary
                      groupCount={collaborator.scopeGroupCount}
                      guestCount={collaborator.scopeGuestCount}
                    />
                  </div>
                )}
              </div>
            </div>

            {!collaborator.isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <IconDots className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {collaborator.role === 'seating_manager' && onEditScope && (
                    <DropdownMenuItem
                      onClick={() => onEditScope(collaborator)}
                    >
                      <IconEye className="mr-2 h-4 w-4" />
                      Edit Scope
                    </DropdownMenuItem>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive"
                      >
                        <IconTrash className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remove collaborator?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {collaborator.fullName} will lose access to this
                          event. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(collaborator)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
