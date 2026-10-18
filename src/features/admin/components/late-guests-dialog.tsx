'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, TriangleAlert, UserPlus } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { getLateGuestPlan, sendToLateGuests } from '../actions/late-guests';
import type { LateGuestCandidate, LateGuestExcluded, LateGuestPlan } from '../actions/late-guests';
import type { EventTimelineRow } from '../types';
import { formatShortDate } from '../utils/format';
import { rsvpLabel } from '../utils/labels';
import { MAX_MANUAL_RECIPIENTS } from '../utils/manual-send';

export type LateSendSchedule = Pick<EventTimelineRow, 'id' | 'title' | 'status' | 'channel'>;

const UNAVAILABLE: Partial<Record<EventTimelineRow['status'], string>> = {
  planned: 'עוד לא נשלח',
  cancelled: 'בוטל',
};

function Stat({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span className="text-muted-foreground text-[11.5px]">{label}</span>
      <span className={cn('text-[17px] font-semibold tabular-nums', muted && 'text-muted-foreground')}>{value}</span>
    </div>
  );
}

function CandidateRow({ guest, checked, disabled, onToggle }: {
  guest: LateGuestCandidate;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-2.5 border-b px-3 py-2 text-[12.5px] last:border-b-0',
        disabled ? 'opacity-50' : 'hover:bg-accent/50 cursor-pointer',
      )}
    >
      <Checkbox
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onToggle(guest.id, value === true)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{guest.name}</span>
          {guest.addedAfterSend && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10.5px] font-normal">נוסף אחרי השליחה</Badge>
          )}
        </span>
        <span className="text-muted-foreground block">
          {guest.groupName ?? 'ללא קבוצה'} · {rsvpLabel(guest.rsvpStatus)} · נוסף ב-{formatShortDate(guest.createdAt)}
        </span>
        {guest.note && <span className="text-muted-foreground block">{guest.note}</span>}
      </span>
      <span className="text-muted-foreground shrink-0 tabular-nums">{formatPhone(guest.phone)}</span>
    </label>
  );
}

function ExcludedRow({ guest }: { guest: LateGuestExcluded }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-3 py-2 text-[12.5px] last:border-b-0">
      <span className="min-w-0">
        <span className="block font-medium">{guest.name}</span>
        <span className="text-muted-foreground block">{guest.reason}</span>
      </span>
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {guest.phone ? formatPhone(guest.phone) : 'אין טלפון'}
      </span>
    </div>
  );
}

/**
 * Sends a Schedule that already went out to guest records it never reached -
 * mostly guests added to the list after the send (backlog 0007).
 *
 * Only guests who never got the message are offered, the cap is the manual
 * path's ten, and the server recomputes who is eligible before sending, so a
 * guest reached in between is dropped rather than messaged twice. Failures are
 * deliberately not here: they are resent from the Schedule's own row, where the
 * error is shown beside them.
 */
export function LateGuestsDialog({ schedules }: { schedules: LateSendSchedule[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [plan, setPlan] = useState<LateGuestPlan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();

  const schedule = schedules.find((row) => row.id === scheduleId) ?? null;

  function reset() {
    setScheduleId(null);
    setPlan(null);
    setLoadError(null);
    setSelected(new Set());
    setConfirming(false);
  }

  function onOpenChange(next: boolean) {
    if (sending) return;
    setOpen(next);
    if (!next) reset();
  }

  function pick(id: string) {
    setScheduleId(id);
    setPlan(null);
    setLoadError(null);
    setSelected(new Set());
    setConfirming(false);
    startLoading(async () => {
      const result = await getLateGuestPlan(id);
      if (result.ok) setPlan(result.plan);
      else setLoadError(result.message);
    });
  }

  function toggle(id: string, checked: boolean) {
    setConfirming(false);
    setSelected((current) => {
      const next = new Set(current);
      if (checked && next.size < MAX_MANUAL_RECIPIENTS) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function send() {
    if (!scheduleId) return;
    const ids = [...selected];
    startSending(async () => {
      const promise = sendToLateGuests(scheduleId, ids).then((result) => {
        // The fresh plan lands even on a refusal: it is how the Operator sees
        // that the guests they picked were reached in the meantime.
        if (result.plan) {
          setPlan(result.plan);
          setSelected(new Set());
        }
        if (!result.success) throw new Error(result.message);
        return result;
      });
      toast.promise(promise, {
        loading: 'שולחים',
        success: (result) => {
          router.refresh();
          return result.message;
        },
        error: (error) => (error instanceof Error ? error.message : 'השליחה נכשלה'),
      });
      try {
        await promise;
      } catch {
        // The toast owns the visible error state
      } finally {
        setConfirming(false);
      }
    });
  }

  const eligible = plan?.eligible ?? [];
  const full = selected.size >= MAX_MANUAL_RECIPIENTS;
  const lateCount = eligible.filter((guest) => guest.addedAfterSend).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-[13px]">
          <UserPlus className="size-[15px]" />
          שליחה לאורחים שנוספו
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>שליחה לאורחים שנוספו אחרי השליחה</DialogTitle>
          <DialogDescription>
            שולח הודעה שכבר יצאה לרשומות שלא קיבלו אותה - בעיקר אורחים שנוספו לרשימה אחרי השליחה
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="late-guests-schedule">הודעה</Label>
            <Select value={scheduleId ?? ''} onValueChange={pick} disabled={sending}>
              <SelectTrigger id="late-guests-schedule" className="w-full">
                <SelectValue placeholder="בחירת הודעה שנשלחה" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((row) => (
                  <SelectItem key={row.id} value={row.id} disabled={row.status !== 'sent'}>
                    {row.title}
                    {row.status !== 'sent' && (
                      <span className="text-muted-foreground"> · {UNAVAILABLE[row.status] ?? 'לא זמין'}</span>
                    )}
                    {row.status === 'sent' && row.channel === 'sms' && (
                      <span className="text-muted-foreground"> · SMS</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-[11.5px]">
              הודעה שעוד לא נשלחה תכלול את כל מי שברשימה כשתישלח, לכן אפשר לבחור רק הודעות שכבר יצאו
            </p>
          </div>

          {loading && !plan ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : loadError ? (
            <Alert>
              <TriangleAlert />
              <AlertTitle>אי אפשר לשלוח את ההודעה הזו מכאן</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : plan ? (
            <>
              <div className="flex gap-4 rounded-lg border px-3 py-2.5">
                <Stat label="ממתינים להודעה" value={eligible.length} />
                <Stat label="כבר קיבלו" value={plan.reachedCount} muted />
                <Stat label="בדרך" value={plan.inFlightCount} muted />
                <Stat label="אי אפשר לשלוח" value={plan.excluded.length} muted />
              </div>

              {eligible.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-muted-foreground">
                      {lateCount > 0
                        ? `${lateCount} נוספו אחרי השליחה${plan.sentAt ? ` (${formatShortDate(plan.sentAt)})` : ''}`
                        : 'רשומות שלא קיבלו את ההודעה'}
                    </span>
                    <span className={cn('tabular-nums', full ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      נבחרו {selected.size} מתוך {MAX_MANUAL_RECIPIENTS} לכל היותר
                    </span>
                  </div>
                  <div className="max-h-64 overflow-auto rounded-lg border">
                    {eligible.map((guest) => (
                      <CandidateRow
                        key={guest.id}
                        guest={guest}
                        checked={selected.has(guest.id)}
                        disabled={sending || (full && !selected.has(guest.id))}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground rounded-lg border px-3 py-4 text-center text-[12.5px]">
                  כל מי שבקהל של ההודעה הזו כבר קיבל אותה, או שהיא בדרך אליו
                </p>
              )}

              {plan.excluded.length > 0 && (
                <Collapsible defaultOpen={eligible.length === 0}>
                  <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12px] font-medium">
                    לא קיבלו ואי אפשר לשלוח מכאן ({plan.excluded.length}) <ChevronDown />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 max-h-48 overflow-auto rounded-lg border">
                    {plan.excluded.map((guest) => <ExcludedRow key={guest.id} guest={guest} />)}
                  </CollapsibleContent>
                </Collapsible>
              )}

              <p className="text-muted-foreground text-[11.5px]">
                ההודעה נשלחת מיד, עם התבנית וההגדרות הנוכחיות של האירוע. עד {MAX_MANUAL_RECIPIENTS} רשומות בכל שליחה - אחרי כל שליחה הרשימה מתעדכנת ואפשר להמשיך
              </p>
            </>
          ) : null}

          {confirming && schedule && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>לשלוח את &quot;{schedule.title}&quot; ל-{selected.size} {selected.size === 1 ? 'אורח' : 'אורחים'} עכשיו?</AlertTitle>
              <AlertDescription>ההודעה יוצאת מיד ואי אפשר לבטל אותה</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>
                חזרה
              </Button>
              <Button variant="destructive" onClick={send} disabled={sending || selected.size === 0}>
                לשלוח עכשיו
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                סגירה
              </Button>
              <Button
                onClick={() => setConfirming(true)}
                disabled={sending || loading || !plan || selected.size === 0 || selected.size > MAX_MANUAL_RECIPIENTS}
              >
                {selected.size > 0 ? `שליחה ל-${selected.size} ${selected.size === 1 ? 'אורח' : 'אורחים'}` : 'בחירת אורחים לשליחה'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
