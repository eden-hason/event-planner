'use client';

import { MoreVertical, Trash2, Send } from 'lucide-react';
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
  onSendWhatsApp: (guest: GuestWithGroupApp) => void;
  isSendingWhatsApp: boolean;
}

export function RowActions({
  guest,
  onDelete,
  onSendWhatsApp,
  isSendingWhatsApp,
}: RowActionsProps) {
  const handleSendWhatsApp = () => {
    onSendWhatsApp(guest);
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
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onClick={handleSendWhatsApp}
          disabled={isSendingWhatsApp}
        >
          <Send className="mr-2 h-4 w-4" />
          {isSendingWhatsApp ? 'Sending...' : 'Send WhatsApp'}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(guest)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete guest
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
