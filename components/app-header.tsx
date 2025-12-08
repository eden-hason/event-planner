'use client';

import { startCase } from 'lodash';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import UserMenu from './user-menu';

function formatPathToTitle(pathname: string): string {
  const segments = pathname.slice(1).split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'home';
  return startCase(lastSegment);
}

interface AppHeaderProps {
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {isMobile && <SidebarTrigger className="-ml-1" />}
        {isMobile && (
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
        )}
        <div className="flex w-full items-center justify-end py-2">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
