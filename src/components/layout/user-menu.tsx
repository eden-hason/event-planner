'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronsUpDown, CloudUpload, LogIn, LogOutIcon } from 'lucide-react';
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
import { useLogout } from '@/components/layout/use-logout';
import { Link } from '@/i18n/navigation';
import { useSaveEvent } from '@/features/auth';
import { cn } from '@/lib/utils';

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
  const { isVisitor, openSave } = useSaveEvent();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  // A Visitor has no name until they save: the menu reads like anyone else's,
  // with a "?" for the face and "Visitor" for the name, and offers saving where
  // an Owner would log out - logging out a Visitor would lose the Event.
  const name = isVisitor ? t('visitor.name') : user.name;
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
      is_visitor: isVisitor,
    });
  }, [user.email, user.id, user.name, isVisitor]);

  const handleLogout = useLogout();

  const subtitle = isVisitor
    ? t('visitor.subtitle')
    : user.email || (user.phone && formatPhone(user.phone));

  const avatar = (
    <Avatar>
      {!isVisitor && user.avatar && <AvatarImage src={user.avatar} alt={name} />}
      <AvatarFallback
        className={cn(
          isVisitor &&
            'border-muted-foreground/40 text-muted-foreground border border-dashed bg-transparent font-semibold',
        )}
      >
        {isVisitor ? '?' : initials || '?'}
      </AvatarFallback>
    </Avatar>
  );

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
              {avatar}
              <div className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{name}</span>
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
                <span className="truncate font-medium">{name}</span>
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
              {isVisitor ? (
                <>
                  <DropdownMenuItem onSelect={() => openSave()}>
                    <CloudUpload />
                    {t('visitor.save')}
                  </DropdownMenuItem>
                  {/* /login warns that signing in discards this Event. */}
                  <DropdownMenuItem asChild>
                    <Link href="/login">
                      <LogIn />
                      {t('visitor.signIn')}
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => void handleLogout()}
                >
                  <LogOutIcon />
                  {t('logOut')}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
