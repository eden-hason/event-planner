# Usage Examples: Schedule Executor

This document shows how to use the schedule executor in your application.

## Basic Usage

### Execute a Schedule (Server Action)

```typescript
'use server';

import { executeSchedule } from '@/features/schedules';

export async function handleExecuteSchedule(scheduleId: string) {
  const result = await executeSchedule(scheduleId);

  if (result.success && result.summary) {
    console.log('Execution Summary:');
    console.log(`- Total guests: ${result.summary.totalGuests}`);
    console.log(`- Sent: ${result.summary.sentCount}`);
    console.log(`- Failed: ${result.summary.failedCount}`);
    console.log(`- Skipped: ${result.summary.skippedCount}`);
    return result;
  } else {
    console.error('Execution failed:', result.message);
    throw new Error(result.message);
  }
}
```

### Use in a React Server Component

```typescript
// app/app/[eventId]/schedules/page.tsx
import { executeSchedule } from '@/features/schedules';

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // This would typically be triggered by a button click via a Server Action
  // For now, showing the structure

  async function handleExecute(formData: FormData) {
    'use server';

    const scheduleId = formData.get('scheduleId') as string;
    const result = await executeSchedule(scheduleId);

    if (!result.success) {
      return { error: result.message };
    }

    return { success: true, summary: result.summary };
  }

  return (
    <div>
      {/* Your schedules list */}
      <form action={handleExecute}>
        <input type="hidden" name="scheduleId" value="..." />
        <button type="submit">Execute Schedule</button>
      </form>
    </div>
  );
}
```

### Use in a Client Component with Toast Feedback

```typescript
'use client';

import { useActionState } from 'react';
import { toast } from 'sonner';
import { executeSchedule } from '@/features/schedules/actions';

type ActionState = {
  success: boolean;
  message: string;
  summary?: {
    sentCount: number;
    failedCount: number;
    skippedCount: number;
  };
} | null;

export function ExecuteScheduleButton({ scheduleId }: { scheduleId: string }) {
  const executeWithToast = async (
    prevState: ActionState,
    formData: FormData,
  ): Promise<ActionState> => {
    const promise = executeSchedule(scheduleId).then((result) => {
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    });

    toast.promise(promise, {
      loading: 'Sending messages...',
      success: (data) => {
        if (data.summary) {
          return `Sent ${data.summary.sentCount} message${data.summary.sentCount !== 1 ? 's' : ''}!`;
        }
        return data.message;
      },
      error: (err) =>
        err instanceof Error ? err.message : 'Failed to execute schedule',
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [state, formAction, isPending] = useActionState(
    executeWithToast,
    null,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {isPending ? 'Sending...' : 'Send Messages'}
      </button>

      {state?.summary && (
        <div className="mt-2 text-sm text-gray-600">
          <p>✓ Sent: {state.summary.sentCount}</p>
          {state.summary.failedCount > 0 && (
            <p className="text-red-600">✗ Failed: {state.summary.failedCount}</p>
          )}
          {state.summary.skippedCount > 0 && (
            <p className="text-yellow-600">⊘ Skipped: {state.summary.skippedCount}</p>
          )}
        </div>
      )}
    </form>
  );
}
```

## Advanced Usage

### Execute with Error Handling

```typescript
import { executeSchedule } from '@/features/schedules';

async function executeWithRetry(
  scheduleId: string,
  maxRetries = 3,
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    const result = await executeSchedule(scheduleId);

    // Success - return immediately
    if (result.success) {
      return result;
    }

    // Check if error is retryable
    const isRetryable = [
      'Failed to send WhatsApp message',
      'Failed to execute schedule',
    ].some((msg) => result.message.includes(msg));

    if (!isRetryable) {
      // Non-retryable error (e.g., "Cannot execute schedule with status: sent")
      throw new Error(result.message);
    }

    attempt++;
    if (attempt < maxRetries) {
      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts`);
}
```

### Batch Execute Multiple Schedules

```typescript
import { executeSchedule } from '@/features/schedules';

async function executeBatch(scheduleIds: string[]) {
  const results = await Promise.allSettled(
    scheduleIds.map((id) => executeSchedule(id)),
  );

  const summary = {
    total: scheduleIds.length,
    succeeded: 0,
    failed: 0,
    totalMessagesSent: 0,
  };

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.success) {
      summary.succeeded++;
      summary.totalMessagesSent += result.value.summary?.sentCount || 0;
    } else {
      summary.failed++;
    }
  }

  return summary;
}
```

### Check Delivery Status After Execution

```typescript
import {
  executeSchedule,
  getDeliveryStats,
  getMessageDeliveriesByScheduleId,
} from '@/features/schedules';

async function executeAndMonitor(scheduleId: string) {
  // Execute the schedule
  const result = await executeSchedule(scheduleId);

  if (!result.success) {
    throw new Error(result.message);
  }

  console.log('Initial execution:', result.summary);

  // Get detailed delivery stats
  const stats = await getDeliveryStats(scheduleId);
  console.log('Delivery stats:', stats);

  // Get individual delivery records
  const deliveries = await getMessageDeliveriesByScheduleId(scheduleId);

  // Check for failures
  const failures = deliveries.filter((d) => d.status === 'failed');
  if (failures.length > 0) {
    console.log('Failed deliveries:', failures);
    // Handle failures (retry, notify admin, etc.)
  }

  return {
    result,
    stats,
    deliveries,
  };
}
```

### Pre-execution Validation

```typescript
import {
  getScheduleById,
  getWhatsAppTemplateById,
  executeSchedule,
} from '@/features/schedules';
import { getEventGuests } from '@/features/guests/queries';
import { validatePhoneNumber, filterGuestsByTarget } from '@/features/schedules';

async function validateAndExecute(scheduleId: string) {
  // 1. Fetch schedule
  const schedule = await getScheduleById(scheduleId);

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  if (schedule.status !== 'scheduled') {
    throw new Error(`Schedule cannot be executed (status: ${schedule.status})`);
  }

  if (!schedule.templateId) {
    throw new Error('No template assigned');
  }

  // 2. Verify template exists
  const template = await getWhatsAppTemplateById(schedule.templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  // 3. Check guests
  const allGuests = await getEventGuests(schedule.eventId);
  const targetedGuests = filterGuestsByTarget(allGuests, schedule.targetFilter);
  const validGuests = targetedGuests.filter((g) => validatePhoneNumber(g.phone));

  if (validGuests.length === 0) {
    throw new Error('No valid recipients found');
  }

  console.log(`About to send to ${validGuests.length} guests`);
  console.log(`Template: ${template.displayName}`);
  console.log(`Event: ${schedule.event.title}`);

  // 4. Execute
  return executeSchedule(scheduleId);
}
```

## Utility Function Examples

### Phone Number Validation

```typescript
import { validatePhoneNumber, formatPhoneE164 } from '@/features/schedules';

// Validate before sending
const guests = [
  { name: 'John', phone: '0541234567' },
  { name: 'Jane', phone: '123' }, // Invalid
  { name: 'Bob', phone: null }, // Invalid
];

const validGuests = guests.filter((g) => validatePhoneNumber(g.phone));
console.log(validGuests); // Only John

// Format to E.164
const phone = formatPhoneE164('0541234567');
console.log(phone); // +972541234567
```

### Template Parameter Building

```typescript
import { buildTemplateParameters } from '@/features/schedules';

const params = buildTemplateParameters(
  'Hi {{guest_name}}, welcome to {{event_title}} on {{event_date}}!',
  'Annual Gala 2026',
  '2026-12-31',
  'Sarah Cohen',
);

console.log(params);
// [
//   { type: 'text', text: 'Sarah Cohen' },
//   { type: 'text', text: 'Annual Gala 2026' },
//   { type: 'text', text: 'Wednesday, December 31, 2026' }
// ]
```

### Guest Filtering

```typescript
import { filterGuestsByTarget } from '@/features/schedules';
import type { GuestApp } from '@/features/guests/schemas';

const allGuests: GuestApp[] = [
  { id: '1', name: 'John', rsvpStatus: 'confirmed', groupId: 'group-1', ... },
  { id: '2', name: 'Jane', rsvpStatus: 'pending', groupId: 'group-2', ... },
  { id: '3', name: 'Bob', rsvpStatus: 'declined', groupId: 'group-1', ... },
];

// Filter by RSVP status
const confirmed = filterGuestsByTarget(allGuests, {
  guestStatus: ['confirmed'],
});
console.log(confirmed); // Only John

// Filter by group
const group1 = filterGuestsByTarget(allGuests, {
  groupIds: ['group-1'],
});
console.log(group1); // John and Bob

// Combined filter
const confirmedGroup1 = filterGuestsByTarget(allGuests, {
  guestStatus: ['confirmed'],
  groupIds: ['group-1'],
});
console.log(confirmedGroup1); // Only John
```

## Integration with Existing Code

### Add Execute Button to Schedule Card

```typescript
// features/schedules/components/schedule-card.tsx
'use client';

import { executeSchedule } from '@/features/schedules/actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ScheduleCard({ schedule }) {
  const handleExecute = async () => {
    const promise = executeSchedule(schedule.id);

    toast.promise(promise, {
      loading: 'Sending messages...',
      success: (result) => {
        if (result.summary) {
          return `Sent ${result.summary.sentCount} messages!`;
        }
        return 'Messages sent!';
      },
      error: 'Failed to send messages',
    });

    const result = await promise;
    if (result.success) {
      // Optionally refresh the page or update UI
      window.location.reload();
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h3>{schedule.event.title}</h3>
      <p>Status: {schedule.status}</p>

      {schedule.status === 'scheduled' && (
        <Button onClick={handleExecute}>
          Send Now
        </Button>
      )}
    </div>
  );
}
```

### Add to Schedule Actions Menu

```typescript
// features/schedules/components/schedule-actions.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { executeSchedule } from '@/features/schedules/actions';
import { Send } from 'lucide-react';

export function ScheduleActionsMenu({ schedule }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        {schedule.status === 'scheduled' && (
          <DropdownMenuItem
            onClick={async () => {
              const result = await executeSchedule(schedule.id);
              if (result.success) {
                alert(`Sent ${result.summary?.sentCount} messages!`);
              } else {
                alert(`Error: ${result.message}`);
              }
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            Send Now
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## API Route (Optional)

If you need external access (webhooks, cron jobs):

```typescript
// app/api/schedules/[id]/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeSchedule } from '@/features/schedules/actions/execute-schedule';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: scheduleId } = await context.params;

    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Execute schedule
    const result = await executeSchedule(scheduleId);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('API execution error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

Usage:
```bash
curl -X POST http://localhost:3000/api/schedules/{schedule-id}/execute \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"
```

## Cron Job Integration (Future)

```typescript
// app/api/cron/execute-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeSchedule } from '@/features/schedules/actions/execute-schedule';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Find schedules that should execute now
    const now = new Date().toISOString();
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_date', now);

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: 'No schedules to execute' });
    }

    // Execute all due schedules
    const results = await Promise.allSettled(
      schedules.map((s) => executeSchedule(s.id)),
    );

    const summary = {
      total: schedules.length,
      succeeded: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Cron execution error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/execute-schedules",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
