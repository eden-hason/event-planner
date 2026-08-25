'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AdminDialogContent } from './admin-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createCallPlan } from '@/features/calls/actions/call-plans';
import { cn } from '@/lib/utils';

export type PlanningEvent = { id: string; title: string; pending: number; confirmed: number };

const TARGETS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
] as const;

/**
 * Creates the plan only. Starting it is a separate act, and the dialog says so
 * rather than leaving an Operator to discover it.
 *
 * The audience helper is deliberately phrased as "today": the snapshot happens
 * at Start, so this number is context for choosing a target, not a promise
 * about who will be called.
 */
export function AddCallRoundDialog({
  events,
  eventId,
}: {
  events: PlanningEvent[];
  /** Pre-selects and locks the event when opened from an event workspace */
  eventId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [selectedEvent, setSelectedEvent] = useState(eventId ?? events[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [target, setTarget] = useState<'pending' | 'confirmed'>('pending');

  const chosen = events.find((event) => event.id === selectedEvent);
  const audience = chosen ? (target === 'pending' ? chosen.pending : chosen.confirmed) : 0;

  function submit() {
    if (!selectedEvent || !date) {
      toast.error('Pick an event and a date');
      return;
    }

    startTransition(async () => {
      const result = await createCallPlan({
        eventId: selectedEvent,
        scheduledDate: date,
        scheduledTime: time,
        targetStatus: target,
      });

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setDate('');
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-[13px]">
          <Plus className="size-[15px]" />
          Add call round
        </Button>
      </DialogTrigger>

      <AdminDialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add call round</DialogTitle>
          <DialogDescription>
            Creates the plan only. You start it when you are ready to call
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="call-plan-event">Event</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent} disabled={!!eventId}>
              <SelectTrigger id="call-plan-event" className="w-full">
                <SelectValue placeholder="Pick an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="call-plan-date">Date</Label>
              <Input
                id="call-plan-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="flex w-32 flex-col gap-1.5">
              <Label htmlFor="call-plan-time">Time</Label>
              <Input
                id="call-plan-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Target audience</Label>
            <div className="flex gap-2">
              {TARGETS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTarget(option.value)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-1.5 text-[13px] font-medium',
                    target === option.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card hover:bg-accent',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-[12.5px]">
              {audience} guest {audience === 1 ? 'record is' : 'records are'} {target} today. The
              audience is snapshotted at start, not now
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            Create plan
          </Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  );
}
