'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { IconSearch } from '@tabler/icons-react';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

interface ScopePickerProps {
  groups: GroupApp[];
  guests: GuestApp[];
  selectedGroups: string[];
  selectedGuests: string[];
  onGroupsChange: (groupIds: string[]) => void;
  onGuestsChange: (guestIds: string[]) => void;
}

export function ScopePicker({
  groups,
  guests,
  selectedGroups,
  selectedGuests,
  onGroupsChange,
  onGuestsChange,
}: ScopePickerProps) {
  const [search, setSearch] = React.useState('');

  const q = search.toLowerCase();

  const filteredGroups = React.useMemo(() => {
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, q]);

  const filteredGuests = React.useMemo(() => {
    if (!q) return guests;
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, q]);

  const toggleGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      onGroupsChange(selectedGroups.filter((id) => id !== groupId));
    } else {
      onGroupsChange([...selectedGroups, groupId]);
    }
  };

  const toggleGuest = (guestId: string) => {
    if (selectedGuests.includes(guestId)) {
      onGuestsChange(selectedGuests.filter((id) => id !== guestId));
    } else {
      onGuestsChange([...selectedGuests, guestId]);
    }
  };

  const totalSelected = selectedGroups.length + selectedGuests.length;
  const noResults = filteredGroups.length === 0 && filteredGuests.length === 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <IconSearch className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
        <Input
          placeholder="Search groups or guests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="max-h-56 space-y-3 overflow-y-auto">
        {filteredGroups.length > 0 && (
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Groups
            </Label>
            {filteredGroups.map((group) => (
              <div key={group.id} className="flex items-center gap-2 py-1">
                <Checkbox
                  id={`group-${group.id}`}
                  checked={selectedGroups.includes(group.id)}
                  onCheckedChange={() => toggleGroup(group.id)}
                />
                <Label
                  htmlFor={`group-${group.id}`}
                  className="cursor-pointer text-sm"
                >
                  {group.name}
                </Label>
              </div>
            ))}
          </div>
        )}

        {filteredGuests.length > 0 && (
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Individual Guests
            </Label>
            {filteredGuests.map((guest) => (
              <div key={guest.id} className="flex items-center gap-2 py-1">
                <Checkbox
                  id={`guest-${guest.id}`}
                  checked={selectedGuests.includes(guest.id)}
                  onCheckedChange={() => toggleGuest(guest.id)}
                />
                <Label
                  htmlFor={`guest-${guest.id}`}
                  className="cursor-pointer text-sm"
                >
                  {guest.name}
                </Label>
              </div>
            ))}
          </div>
        )}

        {noResults && (
          <p className="text-muted-foreground py-4 text-center text-xs">
            No groups or guests found.
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Selected: {selectedGroups.length} group
        {selectedGroups.length !== 1 ? 's' : ''} ·{' '}
        {selectedGuests.length} guest
        {selectedGuests.length !== 1 ? 's' : ''}
        {totalSelected === 0 && ' (at least 1 required)'}
      </p>
    </div>
  );
}
