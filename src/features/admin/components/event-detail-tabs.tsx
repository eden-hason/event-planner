'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Overview', path: '' },
  { label: 'Phone Calls', path: '/calls' },
];

export function EventDetailTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/admin/events/${eventId}`;

  return (
    <div className="flex gap-0 border-b">
      {TABS.map(({ label, path }) => {
        const href = `${base}${path}`;
        const isActive = path === '/calls' ? pathname.endsWith('/calls') : !pathname.endsWith('/calls');
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
