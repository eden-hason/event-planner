'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { GroupInfo, GroupSide, GROUP_SIDES } from '@/features/guests/schemas';
import { NO_PHONE_ISSUE, parseGuestIssue } from '@/features/guests/utils/guest-health';

export type GuestSortKey = 'name_asc' | 'name_desc' | 'created_asc' | 'created_desc' | 'rsvp' | 'amount_desc';

export function useGuestFilters(groups: GroupInfo[]) {
  // `?issue=` arrives from Home's Guest List Health Check. `no-phone` turns on
  // the no-phone filter below and is then dropped from the URL; `duplicates`
  // and `all` scope the list until cleared, sorted by name so likely
  // duplicates sit side by side.
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const issueParam = searchParams.get('issue');
  const issue = parseGuestIssue(issueParam);

  const clearIssue = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('issue');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (issueParam === NO_PHONE_ISSUE) clearIssue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueParam]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSides, setSelectedSides] = useState<GroupSide[]>([]);
  const [noPhoneOnly, setNoPhoneOnly] = useState(issueParam === NO_PHONE_ISSUE);
  const [sortKey, setSortKey] = useState<GuestSortKey>(issue ? 'name_asc' : 'created_asc');

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
    issue,
    clearIssue,
  };
}
