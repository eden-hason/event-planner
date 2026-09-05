'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronsUpDown, LogOutIcon } from 'lucide-react';
import posthog from 'posthog-js';
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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ThemeMenuItems } from '@/components/layout/theme-toggle';
import { formatPhone } from '@/lib/phone';
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

  const subtitle = user.email || (user.phone && formatPhone(user.phone));

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu dir={dir}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={t('userMenu')}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
            >
              <Avatar>
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback>{initials || '?'}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{user.name}</span>
                {subtitle && (
                  <span className="text-muted-foreground truncate text-xs">
                    {subtitle}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ms-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="end"
            side="top"
            sideOffset={8}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1 text-start">
                <span className="truncate font-medium">{user.name}</span>
                {subtitle && (
                  <span className="text-muted-foreground truncate text-xs">
                    {subtitle}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <ThemeMenuItems
                labels={{
                  theme: t('theme'),
                  light: t('themeLight'),
                  dark: t('themeDark'),
                  system: t('themeSystem'),
                }}
              />
            </DropdownMenuGroup>
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
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
