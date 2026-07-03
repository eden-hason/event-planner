import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserById, listAllEvents } from '@/features/admin/queries';
import { startImpersonation } from '@/features/admin/actions/impersonation';
import { EventsTable } from '@/features/admin/components/events-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconChevronLeft } from '@tabler/icons-react';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [user, events] = await Promise.all([
    getUserById(userId),
    listAllEvents(userId),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <IconChevronLeft className="mr-1 h-4 w-4" />
            Users
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {user.fullName || user.email}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
        </div>
        <form action={startImpersonation.bind(null, userId)}>
          <Button type="submit" variant="outline">
            View as user
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
              {user.plan}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Signed up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-medium">{formatDate(user.signupDate)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{user.eventCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.isAdmin ? (
              <Badge variant="destructive">Admin</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">User</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Events</h2>
        <EventsTable events={events} />
      </div>
    </div>
  );
}
