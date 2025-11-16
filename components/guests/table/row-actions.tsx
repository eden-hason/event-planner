'use client';

import { MoreHorizontal, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GuestApp } from '@/lib/schemas/guest.schema';

interface RowActionsProps {
  guest: GuestApp;
  onDelete: (guest: GuestApp) => void;
  onSendSMS: (guest: GuestApp) => void;
  isSendingSMS: boolean;
}

export function RowActions({
  guest,
  onDelete,
  onSendSMS,
  isSendingSMS,
}: RowActionsProps) {
  const handleSendSMS = () => {
    onSendSMS(guest);
  };

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
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={handleSendSMS} disabled={isSendingSMS}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {isSendingSMS ? 'Sending...' : 'Send SMS'}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(guest)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete guest
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
