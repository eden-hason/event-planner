'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Copy, ListChecks, TriangleAlert, X } from '@/components/icons';
import { getVerifySendPlan, sendVerifySendStep } from '../actions/verify-send';
import type { VerifySendPlan, VerifySendRecipient } from '../actions/verify-send';
import {
  formatNotReceivedForClipboard,
  notReceivedRecords,
  parseVerifyMarks,
  serializeVerifyMarks,
  tallyVerifyMarks,
  verifyStorageKey,
  type VerifyMark,
  type VerifyMarks,
  type VerifyRecord,
} from '../utils/verify-send';
import type { QuickSendSchedule } from './quick-send-dialog';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

/**
 * Where the current guest is in their step. The run only ever advances on a
 * mark, so `awaiting-mark` is a deliberate dead end until the Operator answers.
 */
type StepState = 'ready' | 'sending' | 'awaiting-mark' | 'failed';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'muted' | 'success' | 'danger' }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-muted-foreground text-[11.5px]">{label}</span>
      <span
        className={cn(
          'text-[17px] font-semibold tabular-nums',
          tone === 'muted' && 'text-muted-foreground',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The list the whole exercise is for.
 *
 * Rendered both at the end of a run and on the start screen of a schedule that
 * already has marks, because the marks outlive the run: a finished run that has
 * been closed still has its answer in storage, and it would otherwise only be
 * readable by opening devtools.
 */
function NotReceivedList({
  records,
  onCopy,
}: {
  records: VerifyRecord[];
  onCopy: () => void;
}) {
  return (
    <>
      <div className="max-h-56 overflow-y-auto rounded-md border">
        {records.map((record, position) => (
          <div
            key={`${record.phone}-${position}`}
            className="flex items-center justify-between gap-3 border-b px-3 py-2 text-[12.5px] last:border-b-0"
          >
            <span className="min-w-0 truncate font-medium">{record.name}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatPhone(record.phone)}
            </span>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={onCopy}>
        <Copy className="size-4" />
        Copy the not-received list
      </Button>
    </>
  );
}

/**
 * One message, one guest at a time, with a human checking each one landed.
 *
 * The case is a WhatsApp account whose sends are silently not leaving Meta: the
 * API returns success, `message_deliveries` says `sent`, and nothing arrives.
 * The only trustworthy signal is Meta's own send counter, which is account-wide
 * and so can only be attributed to a guest if exactly one send is in flight. So
 * this run sends to a single guest and then stops dead until the Operator has
 * looked at that counter and said what it showed.
 *
 * That is the whole reason there is no auto-advance and no skip: an unattended
 * step would put a second send in the window and make both readings worthless.
 *
 * The marks are the Operator's own notes and stay in this browser - see
 * `utils/verify-send`. The queue underneath is the server's, recomputed from
 * `message_deliveries`, so closing the tab loses the notes but never the place.
 */
export function VerifySendDialog({ schedules }: { schedules: QuickSendSchedule[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState('');
  const [plan, setPlan] = useState<VerifySendPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<VerifySendRecipient[]>([]);
  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<VerifyMarks>({});
  const [step, setStep] = useState<StepState>('ready');
  const [started, setStarted] = useState(false);
  const [pending, startTransition] = useTransition();

  const current = started ? (queue[index] ?? null) : null;
  const finished = started && index >= queue.length;
  const tally = useMemo(() => tallyVerifyMarks(marks), [marks]);
  const notReceived = useMemo(() => notReceivedRecords(marks), [marks]);

  /** Storage is best effort: a browser refusing it must not break the run. */
  const persist = useCallback((id: string, next: VerifyMarks) => {
    try {
      window.localStorage.setItem(verifyStorageKey(id), serializeVerifyMarks(next));
    } catch (error) {
      console.error('Could not save the verified send marks:', error);
    }
  }, []);

  function resetRun() {
    setQueue([]);
    setIndex(0);
    setStep('ready');
    setStarted(false);
  }

  function reset() {
    setScheduleId('');
    setPlan(null);
    setMarks({});
    resetRun();
  }

  async function handleScheduleChange(value: string) {
    setScheduleId(value);
    setPlan(null);
    setMarks({});
    resetRun();
    setLoading(true);
    try {
      const result = await getVerifySendPlan(value);
      if (result.ok) {
        setPlan(result.plan);
        try {
          setMarks(parseVerifyMarks(window.localStorage.getItem(verifyStorageKey(value))));
        } catch (error) {
          console.error('Could not read the saved verified send marks:', error);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Verified send plan failed:', error);
      toast.error('Could not work out who is left to send to');
    } finally {
      setLoading(false);
    }
  }

  /**
   * The queue is frozen when the run starts rather than re-read after each send.
   * Every step removes its guest from the server's `remaining`, so a live queue
   * would renumber itself under the Operator between one guest and the next.
   */
  function startRun() {
    if (!plan) return;
    setQueue(plan.remaining);
    setIndex(0);
    setStep('ready');
    setStarted(true);
  }

  function send() {
    if (!current || !scheduleId) return;
    setStep('sending');
    startTransition(async () => {
      const result = await sendVerifySendStep(scheduleId, current.id);
      if (result.plan) setPlan(result.plan);
      if (result.success) {
        setStep('awaiting-mark');
      } else {
        setStep('failed');
        toast.error(result.message);
      }
    });
  }

  function mark(value: VerifyMark) {
    if (!current) return;
    const next: VerifyMarks = {
      ...marks,
      [current.id]: { mark: value, name: current.name, phone: current.phone },
    };
    setMarks(next);
    persist(scheduleId, next);
    setIndex((position) => position + 1);
    setStep('ready');
  }

  function clearMarks() {
    setMarks({});
    try {
      window.localStorage.removeItem(verifyStorageKey(scheduleId));
    } catch (error) {
      console.error('Could not clear the verified send marks:', error);
    }
  }

  async function copyNotReceived() {
    try {
      await navigator.clipboard.writeText(formatNotReceivedForClipboard(notReceived));
      toast.success(
        `Copied ${notReceived.length} ${notReceived.length === 1 ? 'guest' : 'guests'}`,
      );
    } catch (error) {
      console.error('Could not copy the not-received list:', error);
      toast.error('Could not copy the list - select it and copy by hand');
    }
  }

  // The outreach timeline behind the dialog is stale the moment the first guest
  // is sent to, but refreshing mid-run would rerender the workspace under an
  // Operator who is watching a counter in another window. So it waits for the end.
  useEffect(() => {
    if (finished) router.refresh();
  }, [finished, router]);

  const emptyQueue = plan !== null && plan.remaining.length === 0;
  const claimsOnSend = plan?.status === null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A run in flight is minutes of work whose marks only live here, so an
        // accidental click outside must not be what ends it.
        if (!next && started && !finished && tally.total > 0) {
          toast.info('Finish or reset the run before closing it');
          return;
        }
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-[13px]">
          <ListChecks className="size-[15px]" />
          Verify each send
        </Button>
      </DialogTrigger>

      <AdminDialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Verify each send</DialogTitle>
          <DialogDescription>
            Sends to one guest at a time and waits, so Meta&rsquo;s send counter can be
            checked against a single message before the next one goes out
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!started && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="verify-send-schedule">Message</Label>
              <Select value={scheduleId} onValueChange={handleScheduleChange}>
                <SelectTrigger id="verify-send-schedule" className="w-full">
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
          )}

          {loading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {plan && !loading && (
            <div className="bg-muted/40 flex gap-3 rounded-lg border px-3.5 py-3">
              {started ? (
                <>
                  <Stat label="Received" value={tally.received} tone="success" />
                  <Stat label="Not received" value={tally.notReceived} tone="danger" />
                  <Stat label="Left in run" value={Math.max(queue.length - index, 0)} />
                </>
              ) : (
                <>
                  <Stat label="Audience" value={plan.audienceCount} />
                  <Stat label="Already sent" value={plan.deliveredCount} />
                  <Stat label="Still to go" value={plan.remaining.length} />
                  <Stat label="No phone" value={plan.unreachableCount} tone="muted" />
                </>
              )}
            </div>
          )}

          {/* Before the run: what it is about to do. */}
          {plan && !loading && !started && (
            <>
              {emptyQueue ? (
                <Alert>
                  <AlertTitle>
                    {plan.audienceCount === 0
                      ? 'Nobody to send this to'
                      : 'Everyone reachable has this message'}
                  </AlertTitle>
                  <AlertDescription>
                    {plan.audienceCount === 0
                      ? 'No guest record matches this message’s audience'
                      : 'Nothing is left to send, so there is nothing to verify'}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <p className="text-muted-foreground text-[12.5px]">
                    Sends to {plan.remaining.length}{' '}
                    {plan.remaining.length === 1 ? 'guest' : 'guests'} one at a time, in
                    guest-list order. After each send the run stops until you mark whether
                    Meta&rsquo;s counter moved - there is no skip and nothing advances on its own
                  </p>
                  {claimsOnSend && (
                    <Alert>
                      <TriangleAlert />
                      <AlertTitle>The first send marks this message as sent</AlertTitle>
                      <AlertDescription>
                        A run takes far longer than a blast, and this message is still waiting
                        on its scheduled date. Claiming it stops the automatic send from firing
                        the rest of the list into the window you are measuring. What is left
                        stays here until you send it
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {tally.total > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-[12.5px]">
                    {tally.total} {tally.total === 1 ? 'guest is' : 'guests are'} marked from
                    an earlier run in this browser, {tally.notReceived} as not received -{' '}
                    <button
                      type="button"
                      onClick={clearMarks}
                      className="underline underline-offset-2"
                    >
                      clear them
                    </button>
                  </p>
                  {notReceived.length > 0 && (
                    <NotReceivedList records={notReceived} onCopy={copyNotReceived} />
                  )}
                </div>
              )}
            </>
          )}

          {/* During the run: one guest, then a hard stop on the mark. */}
          {current && (
            <div className="flex flex-col gap-3 rounded-lg border px-3.5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{current.name}</p>
                  <p className="text-muted-foreground truncate text-[12.5px]">
                    {formatPhone(current.phone)}
                    {current.groupName ? ` · ${current.groupName}` : ''}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[11px] tabular-nums">
                  {index + 1} of {queue.length}
                </Badge>
              </div>

              {step === 'awaiting-mark' ? (
                <>
                  <p className="text-[12.5px]">
                    Sent. Check Meta&rsquo;s send counter now, then say what it did
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => mark('received')}
                    >
                      <Check className="size-4" />
                      Received
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => mark('not-received')}
                    >
                      <X className="size-4" />
                      Not received
                    </Button>
                  </div>
                </>
              ) : step === 'failed' ? (
                <>
                  <p className="text-destructive text-[12.5px]">
                    The send itself failed, so nothing reached Meta to count
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={send}
                      disabled={pending}
                    >
                      Try again
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => mark('not-received')}
                      disabled={pending}
                    >
                      Mark not received
                    </Button>
                  </div>
                </>
              ) : (
                <Button type="button" onClick={send} disabled={pending || step === 'sending'}>
                  {step === 'sending' ? 'Sending' : `Send to ${current.name}`}
                </Button>
              )}
            </div>
          )}

          {/* After the run: the list the whole exercise was for. */}
          {finished && (
            <div className="flex flex-col gap-3">
              <Alert>
                <AlertTitle>
                  Run finished - {tally.received} received, {tally.notReceived} not received
                </AlertTitle>
                <AlertDescription>
                  {notReceived.length === 0
                    ? 'Every guest in this run was marked received'
                    : 'These guests have a sent delivery recorded but were marked as never arriving. Nothing here retries them - that is a separate job'}
                </AlertDescription>
              </Alert>

              {notReceived.length > 0 && (
                <NotReceivedList records={notReceived} onCopy={copyNotReceived} />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-[12.5px]">
            {!plan
              ? 'Pick a message'
              : finished
                ? 'Copy the list before closing - the marks are not saved anywhere else'
                : started
                  ? step === 'awaiting-mark'
                    ? 'Waiting on your check of the counter'
                    : `${queue.length - index} left to send`
                  : emptyQueue
                    ? 'Nothing left to verify'
                    : `${plan.remaining.length} ready to walk through`}
          </p>
          <div className="flex gap-2">
            {started && !finished ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetRun();
                  router.refresh();
                }}
                disabled={pending || step === 'sending'}
              >
                Stop run
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                disabled={pending}
              >
                Close
              </Button>
            )}
            {plan && !started && !emptyQueue && (
              <Button type="button" onClick={startRun}>
                Start run
              </Button>
            )}
          </div>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  );
}
