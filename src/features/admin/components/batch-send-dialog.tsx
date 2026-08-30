'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AdminDialogContent } from './admin-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { ChevronDown, Layers } from '@/components/icons';
import { getBatchSendPlan, sendScheduleBatch } from '../actions/batch-send';
import { MAX_BATCH_SIZE } from '../utils/batch-send';
import type { BatchSendPlan } from '../actions/batch-send';
import type { QuickSendSchedule } from './quick-send-dialog';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

/** Offered as one-tap batch sizes; anything else is typed into the field. */
const PRESETS = [50, 100, 250];
const DEFAULT_BATCH_SIZE = 100;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'muted' }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-muted-foreground text-[11.5px]">{label}</span>
      <span
        className={cn(
          'text-[17px] font-semibold tabular-nums',
          tone === 'muted' && 'text-muted-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * One message, part of its audience, now - then the rest later.
 *
 * The Operator's case is a WhatsApp sending limit that will not carry the whole
 * list in one go. So the primary control is a number, not a list: type 100 and
 * the first hundred still waiting are selected. The list underneath is there to
 * be checked and adjusted, not to be worked through.
 *
 * Which guests are "still waiting" is the server's answer, recomputed after
 * every batch, so coming back a day later needs no memory of where the last one
 * stopped.
 */
export function BatchSendDialog({ schedules }: { schedules: QuickSendSchedule[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState('');
  const [plan, setPlan] = useState<BatchSendPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState(String(DEFAULT_BATCH_SIZE));
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();

  const remaining = useMemo(() => plan?.remaining ?? [], [plan]);

  /**
   * The batch is the first N still waiting, minus anyone explicitly unticked.
   * Unticking therefore shortens the batch rather than pulling the next guest
   * up into it - a batch of "100" that quietly became 100 different people is
   * exactly the surprise a sending limit cannot absorb.
   */
  const batch = useMemo(() => {
    const count = Math.min(Number(size) || 0, remaining.length, MAX_BATCH_SIZE);
    return remaining.slice(0, count).filter((recipient) => !deselected.has(recipient.id));
  }, [remaining, size, deselected]);

  const batchIds = useMemo(() => new Set(batch.map((recipient) => recipient.id)), [batch]);

  const listed = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return remaining;
    return remaining.filter(
      (recipient) =>
        recipient.name.toLowerCase().includes(term) || recipient.phone.includes(term),
    );
  }, [remaining, query]);

  // `wanted` is passed rather than read from state: the caller has just reset
  // the batch size, and this closure still holds the previous render's value.
  async function loadPlan(id: string, wanted: number) {
    setLoading(true);
    try {
      const result = await getBatchSendPlan(id);
      if (result.ok) {
        setPlan(result.plan);
        // A short tail is not worth a second visit, so default to sending it all.
        if (result.plan.remaining.length <= wanted) {
          setSize(String(result.plan.remaining.length));
        }
      } else {
        setPlan(null);
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Batch send plan failed:', error);
      setPlan(null);
      toast.error('Could not work out who is left to send to');
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleChange(value: string) {
    setScheduleId(value);
    setPlan(null);
    setDeselected(new Set());
    setQuery('');
    setSize(String(DEFAULT_BATCH_SIZE));
    await loadPlan(value, DEFAULT_BATCH_SIZE);
  }

  function reset() {
    setScheduleId('');
    setPlan(null);
    setDeselected(new Set());
    setQuery('');
    setSize(String(DEFAULT_BATCH_SIZE));
  }

  function toggle(id: string, checked: boolean) {
    setDeselected((current) => {
      const next = new Set(current);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function send() {
    if (!scheduleId || !batch.length) return;
    startTransition(async () => {
      const result = await sendScheduleBatch(
        scheduleId,
        batch.map((recipient) => recipient.id),
      );
      if (result.success) {
        toast.success(result.message);
        // The dialog stays open on the refreshed plan: the next batch is the
        // same three taps, and the numbers are the receipt for this one.
        if (result.plan) {
          setPlan(result.plan);
          setSize(String(Math.min(Number(size) || 0, result.plan.remaining.length)));
        }
        setDeselected(new Set());
        setQuery('');
        router.refresh();
      } else {
        toast.error(result.message);
        if (result.plan) setPlan(result.plan);
      }
    });
  }

  const reachable = plan ? plan.deliveredCount + plan.remaining.length : 0;
  const done = plan !== null && plan.remaining.length === 0;
  const claimsOnSend = plan?.status === null && !done;

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
          <Layers className="size-[15px]" />
          Send in batches
        </Button>
      </DialogTrigger>

      <AdminDialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Send in batches</DialogTitle>
          <DialogDescription>
            Send a message to part of its audience now and the rest later, for when a
            WhatsApp sending limit will not carry the whole list at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="batch-send-schedule">Message</Label>
            <Select value={scheduleId} onValueChange={handleScheduleChange}>
              <SelectTrigger id="batch-send-schedule" className="w-full">
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

          {loading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {plan && !loading && (
            <>
              <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border px-3.5 py-3">
                <div className="flex gap-3">
                  <Stat label="Audience" value={plan.audienceCount} />
                  <Stat label="Already sent" value={plan.deliveredCount} />
                  <Stat label="Still to go" value={plan.remaining.length} />
                  <Stat label="No phone" value={plan.unreachableCount} tone="muted" />
                </div>
                <div className="bg-background h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-success h-full rounded-full transition-[width]"
                    style={{
                      width: `${reachable ? Math.round((plan.deliveredCount / reachable) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {done ? (
                <Alert>
                  <AlertTitle>
                    {reachable === 0
                      ? 'Nobody to send this to'
                      : 'Everyone reachable has this message'}
                  </AlertTitle>
                  <AlertDescription>
                    {reachable === 0
                      ? plan.audienceCount === 0
                        ? 'No guest record matches this message\u2019s audience'
                        : `All ${plan.audienceCount} records in the audience have no usable phone number`
                      : plan.unreachableCount > 0
                        ? `${plan.unreachableCount} records have no usable phone number and were never sendable`
                        : 'Nothing is left to send for this message'}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="batch-send-size">How many to send now</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        id="batch-send-size"
                        type="number"
                        min={1}
                        max={Math.min(plan.remaining.length, MAX_BATCH_SIZE)}
                        value={size}
                        onChange={(event) => setSize(event.target.value)}
                        className="w-[104px]"
                      />
                      {PRESETS.filter((preset) => preset < plan.remaining.length).map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant={Number(size) === preset ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setSize(String(preset))}
                        >
                          {preset}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={
                          Number(size) === Math.min(plan.remaining.length, MAX_BATCH_SIZE)
                            ? 'secondary'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() =>
                          setSize(String(Math.min(plan.remaining.length, MAX_BATCH_SIZE)))
                        }
                      >
                        All {Math.min(plan.remaining.length, MAX_BATCH_SIZE)}
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-[12px]">
                      Takes the first {batch.length} guests still waiting, in guest-list order.
                      Each batch picks up where the last one stopped
                      {plan.remaining.length > MAX_BATCH_SIZE
                        ? ` · ${MAX_BATCH_SIZE} is the most one batch can carry`
                        : ''}
                    </p>
                  </div>

                  <Collapsible>
                    <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12.5px] font-medium">
                      Review the {batch.length} selected <ChevronDown />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 flex flex-col gap-2">
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by name or phone"
                        autoComplete="off"
                      />
                      <div className="max-h-56 overflow-y-auto rounded-md border">
                        {listed.length === 0 ? (
                          <p className="text-muted-foreground p-3 text-[12.5px]">
                            No waiting guest matches that search
                          </p>
                        ) : (
                          listed.map((recipient) => {
                            const inBatch = batchIds.has(recipient.id);
                            return (
                              <label
                                key={recipient.id}
                                className={cn(
                                  'flex items-center gap-2.5 border-b px-3 py-2 text-[12.5px] last:border-b-0',
                                  !inBatch && 'opacity-55',
                                )}
                              >
                                <Checkbox
                                  checked={inBatch}
                                  disabled={!inBatch && !deselected.has(recipient.id)}
                                  onCheckedChange={(value) =>
                                    toggle(recipient.id, value === true)
                                  }
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">
                                    {recipient.name}
                                  </span>
                                  <span className="text-muted-foreground block truncate text-[12px]">
                                    {formatPhone(recipient.phone)}
                                    {recipient.groupName ? ` · ${recipient.groupName}` : ''}
                                  </span>
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11.5px]">
                        Guests past the batch size are shown greyed out - raise the number to
                        include them. Unticking one shortens this batch rather than pulling the
                        next guest into it
                      </p>
                    </CollapsibleContent>
                  </Collapsible>

                  {claimsOnSend && (
                    <p className="text-muted-foreground text-[12px]">
                      This message is still waiting on its scheduled date. The first batch marks
                      it as sent so the automatic send cannot fire the rest in one go - what is
                      left stays here until you send it
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-[12.5px]">
            {!plan
              ? 'Pick a message'
              : done
                ? 'Nothing left to send'
                : `${batch.length} of ${plan.remaining.length} waiting guests`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {done ? 'Close' : 'Cancel'}
            </Button>
            {!done && (
              <Button type="button" onClick={send} disabled={pending || !batch.length}>
                {pending ? 'Sending' : `Send ${batch.length}`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  );
}
