'use client';

import React from 'react';
import { BadgeCheckIcon, LogOutIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconUser } from '@tabler/icons-react';
import { Button } from './ui/button';

const user = {
  name: 'Toby Belhome',
  email: 'contact@bundui.io',
  avatar: 'https://bundui-images.netlify.app/avatars/01.png',
};

interface UserMenuProps {
  user: {
    displayName: string;
    email: string;
    avatar?: string;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <Button variant="link" className="p-0">
          <Avatar className="size-8 rounded-xl">
            <AvatarImage
              src={'https://bundui-images.netlify.app/avatars/01.png'}
              alt={user.displayName}
            />
            <AvatarFallback className="rounded-lg">
              <IconUser />
            </AvatarFallback>
          </Avatar>
          {/* <div className="truncate">{user.displayName}</div>
          <ChevronDown /> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        sideOffset={4}
        side="bottom"
        align="end"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8 rounded-lg">
              <AvatarImage
                src={'https://bundui-images.netlify.app/avatars/01.png'}
                alt={user.displayName}
              />
              <AvatarFallback className="rounded-lg"></AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.displayName}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheckIcon />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600!">
          <LogOutIcon className="text-red-600!" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
