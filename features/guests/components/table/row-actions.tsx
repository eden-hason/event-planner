'use client';

import { IconDots, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GuestWithGroupApp } from '@/features/guests/schemas';

interface RowActionsProps {
  guest: GuestWithGroupApp;
  onDelete: (guest: GuestWithGroupApp) => void;
}

export function RowActions({ guest, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            // Prevent row click when clicking the menu button
            e.stopPropagation();
          }}
        >
          <span className="sr-only">Open menu</span>
          <IconDots size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(guest)}>
          <IconTrash size={16} className="mr-2" />
          Delete guest
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
