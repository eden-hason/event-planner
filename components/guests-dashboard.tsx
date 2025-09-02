'use client';

import { Guest } from '@/lib/dal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Eye, CheckCircle, Clock, XCircle } from 'lucide-react';
import { NumberTicker } from './magicui/number-ticker';

interface GuestsDashboardProps {
  guests: Guest[];
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
}

function MetricCard({ title, value, icon, iconBgColor }: MetricCardProps) {
  return (
    <Card className="shadow-none">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">{title}</div>
          <div className={`p-2 rounded-lg ${iconBgColor}`}>{icon}</div>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          <NumberTicker value={Number(value)} />
        </div>
      </CardContent>
    </Card>
  );
}

export function GuestsDashboard({ guests }: GuestsDashboardProps) {
  // Calculate metrics
  const totalGuests = guests.length;
  const confirmedGuests = guests.filter(
    (g) => g.rsvpStatus === 'confirmed',
  ).length;
  const pendingGuests = guests.filter((g) => g.rsvpStatus === 'pending').length;
  const declinedGuests = guests.filter(
    (g) => g.rsvpStatus === 'declined',
  ).length;
  const totalRevenue = guests.reduce((sum, guest) => sum + guest.amount, 0);

  // Calculate unique groups
  const uniqueGroups = new Set(guests.map((g) => g.group)).size;

  // Calculate average amount per guest
  const averageAmount =
    totalGuests > 0 ? Math.round(totalRevenue / totalGuests) : 0;

  // Calculate percentage changes (mock data for now - in real app, you'd compare with previous period)
  const confirmedPercentage =
    totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0;
  const pendingPercentage =
    totalGuests > 0 ? Math.round((pendingGuests / totalGuests) * 100) : 0;
  const declinedPercentage =
    totalGuests > 0 ? Math.round((declinedGuests / totalGuests) * 100) : 0;

  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        title="Total Guests"
        value={totalGuests}
        icon={<Users className="h-4 w-4" />}
        iconBgColor="bg-blue-100 text-blue-600"
      />

      <MetricCard
        title="Confirmed Invitations"
        value={confirmedGuests}
        icon={<CheckCircle className="h-4 w-4" />}
        iconBgColor="bg-green-100 text-green-600"
      />

      <MetricCard
        title="Pending Invitations"
        value={pendingGuests}
        icon={<Clock className="h-4 w-4" />}
        iconBgColor="bg-yellow-100 text-yellow-600"
      />

      <MetricCard
        title="Declined Invitations"
        value={declinedGuests}
        icon={<XCircle className="h-4 w-4" />}
        iconBgColor="bg-red-100 text-red-600"
      />

      <MetricCard
        title="Invitations Views"
        value={145} // TODO: Get this from the database
        icon={<Eye className="h-4 w-4" />}
        iconBgColor="bg-orange-100 text-orange-600"
      />
    </div>
  );
}
