'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wrench,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

/**
 * Only Overview is built. The rest are honest stubs: reachable and clearly
 * unfinished, rather than disabled or silently broken.
 */
const NAV_ITEMS = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, stub: false },
  { label: 'Users', href: '/admin/users', icon: Users, stub: true },
  { label: 'Events', href: '/admin/events', icon: CalendarDays, stub: true },
  { label: 'Operations', href: '/admin/operations', icon: Wrench, stub: true },
  {
    label: 'Configuration',
    href: '/admin/configuration',
    icon: SlidersHorizontal,
    stub: true,
  },
] as const;

export function BackOfficeNav({
  email,
  environment,
}: {
  email: string;
  environment: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-3.5">
        <div className="flex items-baseline gap-2 px-2">
          <span className="text-[15px] font-bold tracking-tight">Kululu</span>
          <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.09em] uppercase">
            Back Office
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        <SidebarMenu className="gap-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon, stub }) => {
            const isActive =
              href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className="h-9 text-[13.5px] font-medium data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground"
                >
                  <Link href={href}>
                    <Icon className={isActive ? '' : 'text-muted-foreground'} />
                    <span className="flex-1">{label}</span>
                    {stub && (
                      <span className="text-muted-foreground rounded-full border px-1.5 py-px text-[10px] font-semibold tracking-[0.05em]">
                        Stub
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-5 pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground truncate text-xs">{email}</span>
          <span className="text-muted-foreground/70 text-[11px]">{environment}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
