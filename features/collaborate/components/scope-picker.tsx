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
  const [guestSearch, setGuestSearch] = React.useState('');

  const filteredGuests = React.useMemo(() => {
    if (!guestSearch) return guests;
    const q = guestSearch.toLowerCase();
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, guestSearch]);

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

  const totalSelected =
    selectedGroups.length + selectedGuests.length;

  return (
    <div className="space-y-4">
      {groups.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Groups</Label>
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-2">
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
        </div>
      )}

      {guests.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Individual Guests</Label>
          <div className="relative">
            <IconSearch className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search guests..."
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {filteredGuests.map((guest) => (
              <div key={guest.id} className="flex items-center gap-2">
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
            {filteredGuests.length === 0 && (
              <p className="text-muted-foreground py-2 text-center text-xs">
                No guests found.
              </p>
            )}
          </div>
        </div>
      )}

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
