'use client';

import { Plus, Search } from 'lucide-react';
import { useState, useActionState, startTransition } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { GroupWithGuestsApp } from '../../schemas';
import { GroupCard } from './group-card';
import { deleteGroup, DeleteGroupState } from '../../actions/groups';

interface GroupsDirectoryProps {
  eventId: string;
  groups: GroupWithGuestsApp[];
  onAddGroup: () => void;
}

export function GroupsDirectory({
  eventId,
  groups,
  onAddGroup,
}: GroupsDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Delete group action with toast
  const deleteActionWithToast = async (
    prevState: DeleteGroupState | null,
    params: { groupId: string; groupName: string },
  ): Promise<DeleteGroupState | null> => {
    const promise = deleteGroup(eventId, params.groupId).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete group.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: `Deleting ${params.groupName}...`,
      success: (data) => {
        return data.message || 'Group deleted successfully.';
      },
      error: (err) => {
        return err instanceof Error
          ? err.message
          : 'Failed to delete group. Please try again.';
      },
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, deleteGroupAction] = useActionState(deleteActionWithToast, null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    startTransition(() => {
      deleteGroupAction({ groupId, groupName });
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            eventId={eventId}
            onDeleteGroup={() => handleDeleteGroup(group.id, group.name)}
          />
        ))}
        <button
          onClick={onAddGroup}
          className="hover:border-primary hover:text-foreground flex min-h-[275px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 transition-colors"
        >
          <div className="rounded-full bg-white p-4">
            <Plus className="text-primary h-6 w-6" />
          </div>
          <span className="text-lg font-bold">Create new group</span>
          <span className="text-muted-foreground text-sm">
            Add a new segment to your guests
          </span>
        </button>
      </div>
    </div>
  );
}
