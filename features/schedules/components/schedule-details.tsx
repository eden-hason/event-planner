'use client';

import { IconChartBar, IconCircleCheckFilled } from '@tabler/icons-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EventScheduleApp } from '../schemas';
import { ScheduleLogicCard } from './schedule-logic-card';
import { MessageContentCard } from './message-content-card';

interface ScheduleDetailsProps {
  schedule: EventScheduleApp | null;
  eventDate?: string;
}

export function ScheduleDetails({ schedule, eventDate }: ScheduleDetailsProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Top section: 2 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        {/* Left column - stacked cards */}
        <div className="flex flex-col gap-6">
          {/* Automation Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Automation Status
              </CardTitle>
              <CardDescription>
                The automation is currently active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge className="gap-1 rounded-md bg-green-200 py-1 text-green-700">
                <IconCircleCheckFilled className="size-4 text-green-700" />
                Active
              </Badge>
            </CardContent>
          </Card>

          {/* Schedule Logic Card */}
          <ScheduleLogicCard schedule={schedule} eventDate={eventDate} />
        </div>

        {/* Right column - Message Content Card (spans height of both left cards) */}
        <MessageContentCard schedule={schedule} />
      </div>

      {/* Bottom section: Full width - Schedule Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconChartBar className="size-5" />
            Schedule Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>Hello World</div>
        </CardContent>
      </Card>
    </div>
  );
}
