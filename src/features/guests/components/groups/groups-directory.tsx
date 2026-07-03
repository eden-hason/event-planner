'use client';

import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useState, useActionState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  GroupWithGuestsApp,
  GuestApp,
  GroupSide,
  GROUP_SIDES,
} from '../../schemas';
import { GroupCard } from './group-card';
import { AssignGuestsDrawer } from './assign-guests-drawer';
import { deleteGroups, DeleteGroupsState } from '../../actions/groups';
import { SideFilter } from '../filters';

interface GroupsDirectoryProps {
  eventId: string;
  groups: GroupWithGuestsApp[];
  guests: GuestApp[];
  onAddGroup: () => void;
}

export function GroupsDirectory({
  eventId,
  groups,
  guests,
  onAddGroup,
}: GroupsDirectoryProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');

  const [searchTerm, setSearchTerm] = useState('');
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithGuestsApp | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [selectedSides, setSelectedSides] = useState<GroupSide[]>([]);

  const selectionMode = selectedGroupIds.size > 0;

  const handleSideToggle = (side: GroupSide) => {
    setSelectedSides((prev) =>
      prev.includes(side) ? prev.filter((s) => s !== side) : [...prev, side],
    );
  };

  const handleSelectAllSides = () => {
    if (selectedSides.length === GROUP_SIDES.length) {
      setSelectedSides([]);
    } else {
      setSelectedSides([...GROUP_SIDES]);
    }
  };

  const isAllSidesSelected = selectedSides.length === GROUP_SIDES.length;
  const availableGuests = guests.filter((guest) => !guest.groupId);

  const handleToggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleCancelSelection = () => {
    setSelectedGroupIds(new Set());
  };

  const handleDeleteSelected = () => {
    const groupIdsToDelete = Array.from(selectedGroupIds);
    const count = groupIdsToDelete.length;

    setSelectedGroupIds(new Set());

    const promise = deleteGroups(eventId, groupIdsToDelete).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('groups.toast.groupsDeleteFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('groups.toast.deletingGroups', { count }),
      success: (data) => data.message || t('groups.toast.groupsDeleted'),
      error: (err) =>
        err instanceof Error ? err.message : t('groups.toast.groupsDeleteFailed'),
    });
  };

  const deleteActionWithToast = async (
    prevState: DeleteGroupsState | null,
    params: { groupId: string; groupName: string },
  ): Promise<DeleteGroupsState | null> => {
    const promise = deleteGroups(eventId, params.groupId).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('groups.toast.groupDeleteFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('groups.toast.deletingGroup', { name: params.groupName }),
      success: (data) => data.message || t('groups.toast.groupDeleted'),
      error: (err) =>
        err instanceof Error ? err.message : t('groups.toast.groupDeleteFailed'),
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

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSide =
      selectedSides.length === 0 ||
      (group.side && selectedSides.includes(group.side));
    return matchesSearch && matchesSide;
  });

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    startTransition(() => {
      deleteGroupAction({ groupId, groupName });
    });
  };

  const handleAssignGuests = (group: GroupWithGuestsApp) => {
    setSelectedGroup(group);
    setAssignDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {selectionMode ? (
        <div className="bg-muted/50 flex items-center justify-between rounded-lg border px-4 py-3">
          <span className="text-sm font-medium">
            {selectedGroupIds.size === 1
              ? t('groups.selected', { count: selectedGroupIds.size })
              : t('groups.selectedPlural', { count: selectedGroupIds.size })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelSelection}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              {t('groups.deleteGroup')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <IconSearch size={16} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder={t('groups.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-[250px] bg-white pl-10"
            />
          </div>
          <SideFilter
            selectedSides={selectedSides}
            onSideToggle={handleSideToggle}
            onSelectAll={handleSelectAllSides}
            isAllSelected={isAllSidesSelected}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {filteredGroups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            eventId={eventId}
            onDeleteGroup={() => handleDeleteGroup(group.id, group.name)}
            onAssignGuestsClick={() => handleAssignGuests(group)}
            isSelected={selectedGroupIds.has(group.id)}
            onSelectGroup={() => handleToggleGroupSelection(group.id)}
            selectionMode={selectionMode}
          />
        ))}
        <button
          onClick={onAddGroup}
          className="hover:border-primary hover:text-foreground border-muted-foreground/50 flex min-h-[275px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 transition-colors"
        >
          <div className="rounded-full bg-white p-4">
            <IconPlus size={24} className="text-primary" />
          </div>
          <span className="text-lg font-bold">{t('groups.createNew')}</span>
          <span className="text-muted-foreground text-sm">
            {t('groups.createNewDescription')}
          </span>
        </button>
      </div>

      <AssignGuestsDrawer
        open={assignDrawerOpen}
        onOpenChange={setAssignDrawerOpen}
        group={selectedGroup}
        availableGuests={availableGuests}
        eventId={eventId}
      />
    </div>
  );
}
