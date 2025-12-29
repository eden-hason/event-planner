'use client';

import { useState, useMemo } from 'react';
import { GuestWithGroupApp, GroupInfo } from '@/features/guests/schemas';

export function useGuestFilters(guests: GuestWithGroupApp[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Get unique groups from guests (filter out undefined/null groups)
  const uniqueGroups = useMemo(() => {
    const groupMap = new Map<string, GroupInfo>();
    guests.forEach((guest) => {
      if (guest.group && !groupMap.has(guest.group.id)) {
        groupMap.set(guest.group.id, guest.group);
      }
    });
    return Array.from(groupMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [guests]);

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  const handleSelectAllGroups = () => {
    if (selectedGroupIds.length === uniqueGroups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(uniqueGroups.map((g) => g.id));
    }
  };

  const isAllSelected =
    uniqueGroups.length > 0 && selectedGroupIds.length === uniqueGroups.length;

  return {
    searchTerm,
    setSearchTerm,
    selectedGroupIds,
    uniqueGroups,
    handleGroupToggle,
    handleSelectAllGroups,
    isAllSelected,
  };
}
