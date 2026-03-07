'use client';

import { useState } from 'react';
import { StatsCards, type StatItem } from '@/components/ui/stats-cards';
import { type ActivityStatus } from '../types';
import { RecentDeliveryActivity } from './recent-delivery-activity';

interface SchedulePerformanceViewProps {
  stats: StatItem[];
  columns: 2 | 4;
  scheduleId: string;
  eventId: string;
  showRsvpDetails: boolean;
}

export function SchedulePerformanceView({
  stats,
  columns,
  scheduleId,
  eventId,
  showRsvpDetails,
}: SchedulePerformanceViewProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<ActivityStatus[]>([]);

  function handleStatClick(status: string | null) {
    if (status === null) {
      setSelectedStatuses([]);
      return;
    }
    const s = status as ActivityStatus;
    setSelectedStatuses((prev) =>
      prev.length === 1 && prev[0] === s ? [] : [s],
    );
  }

  return (
    <div className="space-y-6">
      <StatsCards
        stats={stats}
        selectedStatuses={selectedStatuses}
        onStatClick={showRsvpDetails ? handleStatClick : undefined}
        columns={columns}
      />
      <RecentDeliveryActivity
        scheduleId={scheduleId}
        eventId={eventId}
        showRsvpDetails={showRsvpDetails}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />
    </div>
  );
}
