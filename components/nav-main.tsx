'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { type Icon } from '@tabler/icons-react';
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
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = isActiveRoute(pathname, item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={isActive}
                  className={isActive ? 'bg-accent text-accent-foreground' : ''}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
