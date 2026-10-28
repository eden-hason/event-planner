'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Banknote,
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
  useSidebar,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

/**
 * Stubs are reachable and clearly unfinished rather than disabled or silently
 * broken. The badge describes the index a click would land on, so it is hidden
 * while the item is active: an Operator on the event workspace reached a real
 * page, and badging Events there would call a built surface unbuilt.
 */
const NAV_ITEMS = [
  { label: 'סקירה', href: '/admin', icon: LayoutDashboard, stub: false },
  { label: 'משתמשים', href: '/admin/users', icon: Users, stub: false },
  { label: 'אירועים', href: '/admin/events', icon: CalendarDays, stub: false },
  { label: 'תשלומים', href: '/admin/payments', icon: Banknote, stub: false },
  { label: 'תפעול', href: '/admin/operations', icon: Wrench, stub: false },
  {
    label: 'הגדרות',
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
  const { setOpenMobile } = useSidebar();

  return (
    // `app-sidebar` borrows the event app's tinted sidebar tokens (see
    // globals.css), so the two shells read as one product.
    // On the right, like the event app's sidebar under the RTL <html>.
    <Sidebar side="right" className="app-sidebar border-sidebar-border">
      {/*
       * Below `md` the sidebar is a Sheet portalled to <body>, which takes no
       * class from the primitive, so `app-sidebar` is re-declared here.
       * `contents` keeps the Sidebar's own flex column intact.
       */}
      <div className="app-sidebar contents">
        <SidebarHeader className="px-3 pt-3.5">
          <div className="flex items-baseline gap-2 px-2">
            <span className="text-primary text-[15px] font-bold tracking-tight">Kululu</span>
            <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.09em] uppercase">
              ניהול
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
                    // `text-start`, not the primitive's `text-left`: under RTL a
                    // left-aligned label sits away from its icon at the far edge.
                    className={cn(
                      'h-9 text-start text-[13.5px]',
                      isActive
                        ? '!bg-app-nav-active !text-app-nav-active-foreground font-bold'
                        : 'text-app-nav font-medium',
                    )}
                  >
                    <Link href={href} onClick={() => setOpenMobile(false)}>
                      <Icon />
                      <span className="flex-1">{label}</span>
                      {stub && !isActive && (
                        <span className="text-muted-foreground rounded-full border px-1.5 py-px text-[10px] font-semibold tracking-[0.05em]">
                          בבנייה
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="gap-3 px-5 pb-4">
          <div className="self-start">
            <ThemeToggle labels={{ light: 'בהיר', dark: 'כהה', system: 'מערכת' }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground truncate text-xs">{email}</span>
            <span className="text-muted-foreground/70 text-[11px]">{environment}</span>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
