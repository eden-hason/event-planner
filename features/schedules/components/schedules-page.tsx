'use client';

import { ScheduleApp } from '../schemas';
import { SchedulesHeader } from './schedules-header';

interface SchedulesPageProps {
  eventId: string;
  schedules: ScheduleApp[];
}

export function SchedulesPage({ eventId, schedules }: SchedulesPageProps) {

  return (
    <>
      <SchedulesHeader />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">Schedules for event {eventId}</p>
      </div>
    </>
  );
}
