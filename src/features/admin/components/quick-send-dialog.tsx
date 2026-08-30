'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AdminDialogContent } from './admin-dialog';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { getQuickSendGuests, sendScheduleToGuest } from '../actions/quick-send';
import type { QuickSendGuest } from '../actions/quick-send';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

export type QuickSendSchedule = {
  id: string;
  title: string;
  scheduledDate: string;
  status: 'planned' | 'sent' | 'cancelled' | 'in_progress' | 'completed';
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * One message, one guest, now.
 *
 * The Operator's case is a guest on the phone who never got the message or
 * deleted it, so everything here is scoped to a single send: no multi-select,
 * no audience filter, and no effect on the schedule's own status. Sending twice
 * is allowed - the guest asking for it is the authority on whether it arrived -
 * but a guest who already has a delivery is marked so it is a decision rather
 * than an accident.
 */
export function QuickSendDialog({ schedules }: { schedules: QuickSendSchedule[] }) {
  const [open, setOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState('');
  const [guests, setGuests] = useState<QuickSendGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [query, setQuery] = useState('');
  const [guestId, setGuestId] = useState('');
  const [pending, startTransition] = useTransition();

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? guests.filter(
          (guest) =>
            guest.name.toLowerCase().includes(term) ||
            (guest.phone ?? '').includes(term),
        )
      : guests;
    return filtered.slice(0, 50);
  }, [guests, query]);

  const selected = guests.find((guest) => guest.id === guestId) ?? null;

  async function handleScheduleChange(value: string) {
    setScheduleId(value);
    setGuestId('');
    setQuery('');
    setGuests([]);
    setLoadingGuests(true);
    try {
      setGuests(await getQuickSendGuests(value));
    } catch (error) {
      console.error('Quick send guest load failed:', error);
      toast.error('Could not load the guest list');
    } finally {
      setLoadingGuests(false);
    }
  }

  function reset() {
    setScheduleId('');
    setGuests([]);
    setQuery('');
    setGuestId('');
  }

  function submit() {
    if (!scheduleId || !guestId) return;
    startTransition(async () => {
      const result = await sendScheduleToGuest(scheduleId, guestId);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-[13px]">
          <Send className="size-[15px]" />
          Quick send
        </Button>
      </DialogTrigger>

      <AdminDialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Quick send</DialogTitle>
          <DialogDescription>
            Sends one message to one guest right now. The schedule itself is left alone
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-send-schedule">Message</Label>
            <Select value={scheduleId} onValueChange={handleScheduleChange}>
              <SelectTrigger id="quick-send-schedule" className="w-full">
                <SelectValue placeholder="Pick a message" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.title}
                    <span className="text-muted-foreground ml-2">
                      {formatDate(schedule.scheduledDate)}
                      {schedule.status === 'sent' ? ' · sent' : ''}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scheduleId && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-send-guest">Guest</Label>
              <Input
                id="quick-send-guest"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or phone"
                autoComplete="off"
              />

              <div className="mt-1 max-h-56 overflow-y-auto rounded-md border">
                {loadingGuests ? (
                  <div className="flex flex-col gap-2 p-2.5">
                    {[0, 1, 2].map((row) => (
                      <Skeleton key={row} className="h-8 w-full" />
                    ))}
                  </div>
                ) : matches.length === 0 ? (
                  <p className="text-muted-foreground p-3 text-[12.5px]">
                    {guests.length === 0
                      ? 'This event has no guest records'
                      : 'No guest matches that search'}
                  </p>
                ) : (
                  matches.map((guest) => (
                    <button
                      key={guest.id}
                      type="button"
                      disabled={!guest.phone}
                      onClick={() => setGuestId(guest.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0',
                        'disabled:cursor-not-allowed disabled:opacity-45',
                        guest.id === guestId ? 'bg-accent' : 'hover:bg-accent/60',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">
                          {guest.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-[12px]">
                          {guest.phone ? formatPhone(guest.phone) : 'No phone number'}
                          {guest.groupName ? ` · ${guest.groupName}` : ''}
                        </span>
                      </span>
                      {guest.alreadySent && (
                        <Badge variant="secondary" className="shrink-0 text-[11px]">
                          Already sent
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>

              {guests.length > matches.length && (
                <p className="text-muted-foreground text-[12px]">
                  Showing {matches.length} of {guests.length} guests - search to narrow it down
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-[12.5px]">
            {selected
              ? selected.alreadySent
                ? `${selected.name} already received this message`
                : `Sending to ${selected.name}`
              : 'Pick a message and a guest'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={pending || !guestId}>
              {pending ? 'Sending' : 'Send now'}
            </Button>
          </div>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  );
}
