'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { IconBolt, IconLoader2, IconUsers } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTION_TYPE_LABELS } from '@/features/schedules/schemas';
import type { ScheduleApp } from '@/features/schedules/schemas';
import { getAudienceLabel } from '@/features/schedules';
import type { GuestCounts } from '../types';
import { triggerScheduleAdmin } from '../actions/trigger-schedule';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getRecipientCount(schedule: ScheduleApp, counts: GuestCounts): number {
  if (schedule.actionType === 'initial_invitation') {
    // pending guests + offline RSVP guests (which may be confirmed/declined but still get invite)
    return counts.pending + counts.offlineRsvp;
  }
  if (schedule.targetStatus === 'pending') return counts.pending;
  if (schedule.targetStatus === 'confirmed') return counts.confirmed;
  return counts.total;
}

export function TriggerScheduleCard({
  schedules,
  guestCounts,
}: {
  schedules: ScheduleApp[];
  guestCounts: GuestCounts;
}) {
  const unsentSchedules = schedules.filter(
    (s) => s.status !== 'sent' && s.status !== 'cancelled',
  );

  const [open, setOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [isSending, startSending] = useTransition();

  const selectedSchedule = unsentSchedules.find((s) => s.id === selectedScheduleId) ?? null;
  const recipientCount = selectedSchedule ? getRecipientCount(selectedSchedule, guestCounts) : null;

  function handleTrigger() {
    if (!selectedScheduleId) return;
    startSending(async () => {
      const promise = triggerScheduleAdmin(selectedScheduleId).then((result) => {
        if (!result.success) throw new Error(result.message);
        return result;
      });
      toast.promise(promise, {
        loading: 'Triggering schedule…',
        success: (data) => {
          setOpen(false);
          setSelectedScheduleId('');
          return data.message ?? 'Schedule triggered';
        },
        error: (err) => (err instanceof Error ? err.message : 'Failed to trigger schedule'),
      });
      await promise.catch(() => {});
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group flex flex-col gap-3 rounded-xl border bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100">
            <IconBolt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Trigger Schedule</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manually trigger a schedule for its target audience
            </p>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Trigger Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {unsentSchedules.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No unsent schedules for this event
            </p>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Schedule</label>
              <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a schedule…" />
                </SelectTrigger>
                <SelectContent>
                  {unsentSchedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span>
                        {s.actionType ? ACTION_TYPE_LABELS[s.actionType] : 'Schedule'}
                        <span className="ml-2 text-muted-foreground">
                          · {formatDate(s.scheduledDate)} · {getAudienceLabel(s.targetStatus)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {recipientCount !== null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconUsers className="h-3.5 w-3.5" />
                  <span>{recipientCount} recipient{recipientCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTrigger}
              disabled={!selectedScheduleId || isSending || unsentSchedules.length === 0}
            >
              {isSending && <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Trigger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
