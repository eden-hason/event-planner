'use client';

import { EllipsisVertical, Trash2, Beer, type LucideIcon } from 'lucide-react';
import * as TablerIcons from '@tabler/icons-react';
import {
  Card,
  CardAction,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupWithGuestsApp } from '../../schemas';
import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { IconUserFilled, IconUserPlus } from '@tabler/icons-react';

// Map of Lucide icons used in the group icon selector
const LucideIcons: Record<string, LucideIcon> = {
  LucideBeer: Beer,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface GroupCardProps {
  group: GroupWithGuestsApp;
  eventId: string;
  onDeleteGroup: () => void;
}

function GroupIcon({ iconName }: { iconName: string | null }) {
  if (!iconName) return null;

  const isLucideIcon = iconName.startsWith('Lucide');

  if (isLucideIcon) {
    const LucideIcon = LucideIcons[iconName];
    return LucideIcon ? <LucideIcon className="h-5 w-5" /> : null;
  }

  const TablerIcon = TablerIcons[
    iconName as keyof typeof TablerIcons
  ] as React.ComponentType<{ className?: string }>;

  return TablerIcon ? <TablerIcon className="h-5 w-5" /> : null;
}

export function GroupCard({ group, onDeleteGroup }: GroupCardProps) {
  return (
    <Card className="relative gap-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-3 text-base font-medium">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
            <GroupIcon iconName={group.icon} />
          </div>
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          {group.side && (
            <Badge
              className={
                group.side === 'groom'
                  ? 'border-blue-500 bg-blue-100 text-blue-600'
                  : 'border-primary bg-primary/10 text-primary'
              }
            >
              {group.side}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                <span className="sr-only">Open menu</span>
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={onDeleteGroup}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-md font-bold">{group.name}</p>
          <p className="text-muted-foreground min-h-5 text-sm">
            {group.description || '\u00A0'}
          </p>
        </div>

        <Separator />

        {group.guestCount > 0 ? (
          <div className="flex flex-row items-center justify-between">
            <div className="flex -space-x-2">
              {group.guests.slice(0, 3).map((guest) => (
                <Avatar
                  key={guest.id}
                  className="border-background size-7 border-2"
                >
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {getInitials(guest.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {group.guests.length > 3 && (
                <Avatar className="border-background size-7 border-2">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                    +{group.guests.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            <Badge variant="secondary" className="rounded-sm">
              {group.guestCount} guests
            </Badge>
          </div>
        ) : (
          <div className="flex flex-row items-center gap-2 py-[2px]">
            <IconUserFilled className="text-muted-foreground bg-muted-foreground/10 size-6 rounded-full border border-dashed border-gray-500 p-1" />
            <p className="text-muted-foreground text-sm">
              No guests assigned yet
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-4">
        <Button variant="secondary" className="w-full">
          <IconUserPlus className="size-4" />
          Assign guests
        </Button>
      </CardFooter>
    </Card>
  );
}
