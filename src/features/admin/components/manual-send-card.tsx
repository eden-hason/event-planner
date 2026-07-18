'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { IconSend, IconLoader2 } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { SCHEDULE_TYPE_LABELS, type ScheduleApp } from '@/features/schedules';
import { getGuestsForManualSend } from '../queries/event-detail';
import { sendManualMessages } from '../actions/send-manual';
import type { GuestWithDeliveryStatus } from '../queries/event-detail';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function ScheduleLabel({ schedule }: { schedule: ScheduleApp }) {
  const label = SCHEDULE_TYPE_LABELS[schedule.scheduleTypeKey] ?? 'Schedule';
  return (
    <span>
      {label}
      <span className="ml-2 text-muted-foreground">· {formatDate(schedule.scheduledDate)}</span>
      {schedule.status === 'sent' && (
        <Badge variant="secondary" className="ml-2 text-xs">
          Sent
        </Badge>
      )}
    </span>
  );
}

export function ManualSendCard({
  eventId,
  schedules,
}: {
  eventId: string;
  schedules: ScheduleApp[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [guests, setGuests] = useState<GuestWithDeliveryStatus[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [isSending, startSending] = useTransition();

  async function handleScheduleChange(scheduleId: string) {
    setSelectedScheduleId(scheduleId);
    setSelectedGuestIds(new Set());
    setGuests([]);
    setLoadingGuests(true);
    try {
      const result = await getGuestsForManualSend(eventId, scheduleId);
      const sorted = [...result.filter((g) => g.phone), ...result.filter((g) => !g.phone)];
      setGuests(sorted);
      // Default-select guests with no delivery
      setSelectedGuestIds(new Set(sorted.filter((g) => g.phone && !g.hasDelivery).map((g) => g.id)));
    } finally {
      setLoadingGuests(false);
    }
  }

  function toggleGuest(id: string) {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const selectableIds = guests.filter((g) => g.phone).map((g) => g.id);
    if (selectedGuestIds.size === selectableIds.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(selectableIds));
    }
  }

  function handleSend() {
    if (!selectedScheduleId || selectedGuestIds.size === 0) return;
    startSending(async () => {
      const promise = sendManualMessages(selectedScheduleId, [...selectedGuestIds]).then(
        (result) => {
          if (!result.success) throw new Error(result.message);
          return result;
        },
      );
      toast.promise(promise, {
        loading: `Sending to ${selectedGuestIds.size} guest${selectedGuestIds.size !== 1 ? 's' : ''}…`,
        success: (data) => {
          setOpen(false);
          // Refresh guest list to reflect new deliveries
          handleScheduleChange(selectedScheduleId);
          return data.message ?? 'Messages sent';
        },
        error: (err) => (err instanceof Error ? err.message : 'Failed to send'),
      });
      await promise.catch(() => {});
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group flex flex-col gap-3 rounded-xl border bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
            <IconSend className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Manual Message Send</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Send a schedule message to specific guests
            </p>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manual Message Send</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Schedule</label>
            <Select value={selectedScheduleId} onValueChange={handleScheduleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a schedule…" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <ScheduleLabel schedule={s} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedScheduleId && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Guests
                  {guests.length > 0 && (
                    <span className="ml-1.5 text-muted-foreground">({guests.length})</span>
                  )}
                </label>
                {guests.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {selectedGuestIds.size === guests.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {loadingGuests ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading guests…
                </div>
              ) : guests.length === 0 ? (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  No guests found
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
                  {guests.map((guest) => {
                    const noPhone = !guest.phone;
                    return (
                      <label
                        key={guest.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5',
                          noPhone ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-muted/50',
                        )}
                      >
                        <Checkbox
                          checked={selectedGuestIds.has(guest.id)}
                          onCheckedChange={() => !noPhone && toggleGuest(guest.id)}
                          disabled={noPhone}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{guest.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {guest.phone ?? 'No phone'}
                            <span className="mx-1.5">·</span>
                            {guest.rsvpStatus}
                          </p>
                        </div>
                        {guest.hasDelivery && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            Sent
                          </Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedScheduleId || selectedGuestIds.size === 0 || isSending}
            >
              {isSending && <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Send to {selectedGuestIds.size > 0 ? selectedGuestIds.size : '…'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
