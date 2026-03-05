'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      icon: <IconUserPlus className="h-4 w-4" />,
      href: `/app/${eventId}/guests`,
    },
    {
      label: 'Create Schedule',
      icon: <IconCalendarPlus className="h-4 w-4" />,
      href: `/app/${eventId}/schedules`,
    },
    {
      label: 'View All Guests',
      icon: <IconUsers className="h-4 w-4" />,
      href: `/app/${eventId}/guests`,
    },
    {
      label: 'Import CSV',
      icon: <IconFileImport className="h-4 w-4" />,
      href: `/app/${eventId}/guests`,
    },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        {actions.map(({ label, icon, href }) => (
          <Button key={label} variant="outline" className="w-full justify-start gap-2" asChild>
            <Link href={href}>
              {icon}
              {label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
