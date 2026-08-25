'use client';

import Image from 'next/image';
import { type AppShellUser, UserMenu } from '@/components/layout/user-menu';

export function AppTopBar({ user }: { user: AppShellUser }) {
  return (
    <header
      data-app-header
      className="relative z-20 flex h-(--header-height) shrink-0 items-center border-b border-app-header-border bg-app-header px-4 text-app-header-foreground"
    >
      <a
        href="/app"
        dir="ltr"
        aria-label="Kululu home"
        className="absolute inset-y-0 left-4 flex items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-header"
      >
        <Image
          src="/kululu-logo-label.svg"
          alt="Kululu"
          width={120}
          height={36}
          className="h-9 w-auto"
        />
      </a>
      <div className="absolute inset-y-0 right-4 flex items-center">
        <UserMenu user={user} />
      </div>
    </header>
  );
}
