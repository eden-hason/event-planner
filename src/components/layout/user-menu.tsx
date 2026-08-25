'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LogOutIcon } from 'lucide-react';
import posthog from 'posthog-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/features/auth';

export interface AppShellUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export function UserMenu({ user }: { user: AppShellUser }) {
  const locale = useLocale();
  const t = useTranslations('sidebar');
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
      !process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      return;
    }

    const identifiedUserId = posthog.get_property('$user_id');
    if (identifiedUserId && identifiedUserId !== user.id) {
      posthog.reset();
    }

    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
    });
  }, [user.email, user.id, user.name]);

  const handleLogout = async () => {
    if (
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      posthog.reset();
    }

    await logout();
  };

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('userMenu')}>
          <Avatar>
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback>{initials || '?'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1 text-start">
            <span className="truncate font-medium">{user.name}</span>
            {(user.email || user.phone) && (
              <span className="text-muted-foreground truncate text-xs">
                {user.email || user.phone}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => void handleLogout()}
          >
            <LogOutIcon />
            {t('logOut')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
