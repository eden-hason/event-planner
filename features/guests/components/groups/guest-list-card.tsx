'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from '@/components/ui/item';
import { GuestApp } from '../../schemas';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface GuestListCardProps {
  title: string;
  guests: GuestApp[];
  countLabel: string;
  onSelectionChange?: (selectedGuests: GuestApp[]) => void;
}

export function GuestListCard({
  title,
  guests,
  countLabel,
  onSelectionChange,
}: GuestListCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selections when guests list changes
  useEffect(() => {
    setSelectedIds(new Set());
    onSelectionChange?.([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests]);

  const filteredGuests = guests.filter((guest) =>
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleToggleGuest = (guest: GuestApp) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(guest.id)) {
      newSelectedIds.delete(guest.id);
    } else {
      newSelectedIds.add(guest.id);
    }
    setSelectedIds(newSelectedIds);

    const selectedGuests = guests.filter((g) => newSelectedIds.has(g.id));
    onSelectionChange?.(selectedGuests);
  };

  return (
    <Card className="flex min-w-sm flex-1 flex-col min-h-0 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex w-full items-center justify-between">
          {title}
          <span className="text-muted-foreground text-sm font-normal">
            {guests.length} {countLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 px-0 min-h-0 overflow-hidden">
        <div className="relative px-6">
          <Search className="text-muted-foreground absolute top-1/2 left-9 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search guests..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="bg-muted/50 pl-10"
          />
        </div>

        <Separator />

        {/* Guest list */}
        <div className="flex flex-1 flex-col overflow-y-auto px-6 min-h-0">
          {filteredGuests.map((guest) => (
            <Item
              key={guest.id}
              size="sm"
              className="hover:bg-muted/50 cursor-pointer rounded-lg"
              onClick={() => handleToggleGuest(guest)}
            >
              <Checkbox
                checked={selectedIds.has(guest.id)}
                onCheckedChange={() => handleToggleGuest(guest)}
                onClick={(e) => e.stopPropagation()}
              />
              <ItemMedia>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(guest.name)}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{guest.name}</ItemTitle>
                <ItemDescription className="text-muted-foreground">
                  {guest.rsvpStatus}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
