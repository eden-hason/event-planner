'use client';
import { usePathname, Link } from '@/i18n/navigation';
import { type Icon } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

// Helper function to check if pathname matches the route pattern
// Handles both /app/dashboard and /app/{eventId}/dashboard
function isActiveRoute(pathname: string, routeUrl: string): boolean {
  // Exact match (handles both /app/dashboard and /app/{eventId}/dashboard)
  if (pathname === routeUrl) {
    return true;
  }

  // Extract the route path without /app prefix
  // routeUrl might be /app/dashboard or /app/{eventId}/dashboard
  const routeMatch = routeUrl.match(/^\/app\/(?:[^/]+\/)?(.+)$/);
  if (!routeMatch) return false;

  const routePath = routeMatch[1];

  // Check if pathname matches the pattern /app/{eventId}/{routePath}
  const pathnameMatch = pathname.match(/^\/app\/(?:[^/]+\/)?(.+)$/);
  if (pathnameMatch) {
    const pathnameRoute = pathnameMatch[1];
    return pathnameRoute === routePath;
  }

  return false;
}

export function NavMain({
  items,
  disabled,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
    comingSoon?: boolean;
  }[];
  disabled?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isUnavailable = item.comingSoon || disabled;
            const isActive = !isUnavailable && isActiveRoute(pathname, item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild={!isUnavailable}
                  isActive={isActive}
                  className={[
                    isActive
                      ? '!bg-sidebar-primary !text-sidebar-primary-foreground font-semibold shadow-sm [&>svg]:text-sidebar-primary-foreground'
                      : 'hover:!bg-sidebar-accent/60',
                    isUnavailable ? 'cursor-default opacity-50 pointer-events-none' : '',
                  ].join(' ')}
                >
                  {isUnavailable ? (
                    <>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      {item.comingSoon && (
                        <Badge className="ms-auto rounded-sm border-none bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                          {t('comingSoon')}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
