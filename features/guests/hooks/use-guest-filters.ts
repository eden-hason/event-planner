'use client';

import { useState, useMemo } from 'react';
import { GuestApp } from '@/features/guests/schemas';

export function useGuestFilters(guests: GuestApp[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Get unique groups from guests (filter out undefined, null, and empty strings)
  const uniqueGroups = useMemo(() => {
    const groups = new Set(
      guests
        .map((guest) => guest.guestGroup)
        .filter(
          (group): group is string =>
            group !== undefined && group !== null && group.trim() !== '',
        ),
    );
    return Array.from(groups).sort();
  }, [guests]);

  const handleGroupToggle = (group: string) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const handleSelectAllGroups = () => {
    if (selectedGroups.length === uniqueGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups([...uniqueGroups]);
    }
  };

  const isAllSelected = selectedGroups.length === uniqueGroups.length;

  return {
    searchTerm,
    setSearchTerm,
    selectedGroups,
    uniqueGroups,
    handleGroupToggle,
    handleSelectAllGroups,
    isAllSelected,
  };
}

