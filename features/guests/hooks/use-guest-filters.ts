'use client';

import { useState } from 'react';
import { GroupInfo, GroupSide, GROUP_SIDES } from '@/features/guests/schemas';

export type GuestSortKey = 'name_asc' | 'name_desc' | 'created_asc' | 'created_desc' | 'rsvp' | 'amount_desc';

export function useGuestFilters(groups: GroupInfo[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSides, setSelectedSides] = useState<GroupSide[]>([]);
  const [noPhoneOnly, setNoPhoneOnly] = useState(false);
  const [sortKey, setSortKey] = useState<GuestSortKey>('created_asc');

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  const handleSelectAllGroups = () => {
    if (selectedGroupIds.length === groups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(groups.map((g) => g.id));
    }
  };

  const isAllSelected =
    groups.length > 0 && selectedGroupIds.length === groups.length;

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

  const toggleNoPhoneOnly = () => setNoPhoneOnly((prev) => !prev);

  return {
    searchTerm,
    setSearchTerm,
    selectedGroupIds,
    handleGroupToggle,
    handleSelectAllGroups,
    isAllSelected,
    selectedStatuses,
    handleStatusToggle,
    selectedSides,
    handleSideToggle,
    handleSelectAllSides,
    isAllSidesSelected,
    noPhoneOnly,
    toggleNoPhoneOnly,
    sortKey,
    setSortKey,
  };
}
