'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cardHover, cn } from '@/lib/utils';
import {
  IconUserPlus,
  IconCalendarPlus,
  IconUsers,
  IconFileImport,
} from '@tabler/icons-react';

export function QuickActionsCard({ eventId }: { eventId: string }) {
  const actions = [
    {
      label: 'Add Guest',
      description: 'Invite new guests',
      icon: <IconUserPlus className="h-4 w-4" />,
      href: `/app/${eventId}/guests`,
    },
    {
      label: 'Create Schedule',
      description: 'Plan event timeline',
      icon: <IconCalendarPlus className="h-4 w-4" />,
      href: `/app/${eventId}/schedules`,
    },
    {
      label: 'View All Guests',
      description: 'Manage guest list',
      icon: <IconUsers className="h-4 w-4" />,
      href: `/app/${eventId}/guests`,
    },
    {
      label: 'Import CSV',
      description: 'Bulk upload guests',
      icon: <IconFileImport className="h-4 w-4" />,
      href: `/app/${eventId}/guests`,
    },
  ];

  return (
    <Card className={`flex flex-col ${cardHover}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        <p className="text-xs text-muted-foreground">Common tasks</p>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {actions.map(({ label, description, icon, href }, i) => (
          <Link
            key={label}
            href={href}
            className={cn(
              'flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50',
              i < actions.length - 1 && 'border-b',
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
