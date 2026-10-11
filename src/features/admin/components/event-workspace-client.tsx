'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronLeft, Link2, MessageSquare, Phone, PhoneOff, TriangleAlert } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
} from '@/components/ui/dialog';
import { QueueRowAction, type QueueActionRow } from './queue-row-action';
import { ScheduleControls } from './schedule-controls';
import { SmsFallbackDialog } from './sms-fallback-dialog';
import { sendSelectedDeliveriesAdmin } from '@/features/schedules';
import { MAX_MANUAL_RECIPIENTS } from '../utils/manual-send';
import type { EventGuestSummary, EventTimelineRow, EventWorkspaceSignal } from '../types';
import { formatShortDate } from '../utils/format';
import { audienceCountLabel, deliveryStatusLabel, SIGNAL_GROUP_LABELS } from '../utils/labels';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

export function PublicEventActions({ shortCode }: { shortCode: string }) {
  const path = `/r/${shortCode}`;
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success('הקישור לעמוד האורחים הועתק');
  }
  return (
    <div className="bg-muted flex max-w-full items-center gap-2 self-start rounded-md border px-2.5 py-[7px]">
      <Link2 aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <code className="text-foreground/80 min-w-0 truncate text-[12.5px]">kululu.app{path}</code>
      <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={copy}>העתקה</Button>
      <span aria-hidden className="text-muted-foreground">·</span>
      <Button asChild variant="link" size="xs" className="h-auto p-0">
        <Link href={path} target="_blank">פתיחה כאורח</Link>
      </Button>
    </div>
  );
}

export function PhoneQualityDisclosure({ summary }: { summary: EventGuestSummary }) {
  if (!summary.unusablePhones.length) return null;
  return (
    <Collapsible>
      <Alert>
        <PhoneOff />
        <AlertTitle>ל-{summary.unusablePhones.length} מתוך {summary.guestRecords} רשומות אין מספר טלפון</AlertTitle>
        <AlertDescription>כל שליחה מדלגת עליהן ורושמת אותן כלא נשלחו, כך שאחוזי ההגעה למטה לא יגיעו ל-100%. אפשר לקבל מהן תשובה רק בשיחה או כשבעלי האירוע מזינים אותה</AlertDescription>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="xs" className="absolute top-2 end-2">הצגת הרשימה</Button>
        </CollapsibleTrigger>
      </Alert>
      <CollapsibleContent className="mt-2 overflow-hidden rounded-lg border">
        {summary.unusablePhones.map((guest) => (
          <div key={guest.id} className="flex items-center justify-between gap-4 border-b px-3 py-2 text-[12.5px] last:border-b-0">
            <span className="font-medium">{guest.name}</span>
            <span className="text-muted-foreground">{guest.groupName ?? 'ללא קבוצה'} · {guest.phone ? formatPhone(guest.phone) : 'אין מספר טלפון'}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorkspaceSignals({ signals }: { signals: EventWorkspaceSignal[] }) {
  if (!signals.length) return null;
  // Only the failure kinds take colour (see SignalRow).
  const destructive = signals.some(
    (signal) => signal.kind === 'overdue_schedule' || signal.kind === 'failed_delivery',
  );
  const groups = signals.length > 6
    ? (Object.keys(SIGNAL_GROUP_LABELS) as EventWorkspaceSignal['kind'][])
      .map((kind) => ({ kind, rows: signals.filter((signal) => signal.kind === kind) }))
      .filter((group) => group.rows.length > 0)
    : null;
  const signalRow = (signal: EventWorkspaceSignal) => (
    <Link key={signal.id} href={signal.href} className="hover:bg-accent/50 flex items-center justify-between gap-5 border-t px-4 py-3">
      <span><span className="block text-[13.5px] font-medium">{signal.headline}</span><span className="text-muted-foreground text-[12px]">{signal.detail}</span></span>
      <span className="text-[12px] font-medium">לבדיקה</span>
    </Link>
  );
  return (
    <section className={cn('overflow-hidden rounded-xl border shadow-xs', destructive ? 'border-destructive/30 bg-destructive/5' : 'bg-card')}>
      <h2 className={cn('px-4 pt-3.5 pb-2.5 text-[11.5px] font-semibold tracking-[0.07em] uppercase', destructive ? 'text-destructive' : 'text-muted-foreground')}>
        {destructive ? 'דורש טיפול באירוע הזה' : 'עבודה פתוחה'}
      </h2>
      {groups ? groups.map((group) => (
        <div key={group.kind}>
          <p className="text-muted-foreground border-t px-4 py-2 text-[10.5px] font-semibold tracking-[0.06em] uppercase">{SIGNAL_GROUP_LABELS[group.kind]}</p>
          {group.rows.slice(0, 4).map(signalRow)}
          {group.rows.length > 4 && (
            <Link href="#outreach-timeline" className="text-muted-foreground hover:text-foreground block border-t px-4 py-2.5 text-[12px] font-medium">
              עוד {group.rows.length - 4} בציר התקשורת
            </Link>
          )}
        </div>
      )) : signals.map(signalRow)}
    </section>
  );
}

const CHANNEL_LABEL: Record<string, string> = { whatsapp: 'WhatsApp', sms: 'SMS' };

const TIMELINE_STATUS_LABELS: Record<EventTimelineRow['status'], string> = {
  planned: 'מתוכנן',
  sent: 'נשלח',
  cancelled: 'בוטל',
  in_progress: 'בתהליך',
  completed: 'הושלם',
};

/**
 * How a set of deliveries splits across channels, or null when they all went the
 * same way. A schedule is labelled with its template's channel, but any delivery
 * can fall back to SMS - so a bare count under a "WhatsApp" heading silently
 * counts the SMS ones as WhatsApp. Spell the split out rather than filtering it
 * away: those messages were still sent, they just did not go over WhatsApp.
 */
function channelBreakdown(deliveries: EventTimelineRow['deliveries']): string | null {
  const counts = new Map<string, number>();
  for (const delivery of deliveries) {
    const key = delivery.channel ?? 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size < 2) return null;
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([channel, count]) => `${count} ${CHANNEL_LABEL[channel] ?? channel}`)
    .join(' · ');
}

export function EventTimeline({ rows, eventId, sendingEnabled }: { rows: EventTimelineRow[]; eventId: string; sendingEnabled: boolean }) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => <TimelineRow key={row.id} row={row} eventId={eventId} sendingEnabled={sendingEnabled} />)}
    </div>
  );
}

function TimelineRow({ row, eventId, sendingEnabled }: { row: EventTimelineRow; eventId: string; sendingEnabled: boolean }) {
  const failed = row.deliveries.filter((delivery) => delivery.status === 'failed');
  const successful = row.deliveries.filter((delivery) => ['sent', 'delivered', 'read'].includes(delivery.status));
  // A not-sent delivery is a guest no attempt could be made for (no phone).
  const attempted = row.deliveries.filter((delivery) => delivery.status !== 'not_sent').length;
  const successfulChannels = channelBreakdown(successful);
  const includesManualResends = row.deliveries.some((delivery) => delivery.triggeredBy === 'manual')
    && row.deliveries.some((delivery) => delivery.triggeredBy === 'scheduled');
  const audienceLabel = audienceCountLabel(row.targetStatus, row.audienceCount);
  const channelLabel = row.channel === 'whatsapp' ? 'WhatsApp' : row.channel === 'sms' ? 'SMS' : null;
  const actionRow: QueueActionRow = {
    id: row.id,
    kind: row.kind,
    title: row.title,
    audienceLabel,
    channel: channelLabel,
  };
  const rail = failed.length
    ? 'border-s-destructive'
    : row.status === 'in_progress'
      ? 'border-s-primary'
      : row.status === 'sent' || row.status === 'completed'
        ? 'border-s-success'
        : 'border-s-border';
  const dateLabel = row.status === 'cancelled' || !row.scheduledDate
    ? null
    : formatShortDate(row.scheduledDate);
  return (
    <div id={`schedule-${row.id}`} className="grid scroll-mt-20 grid-cols-[96px_minmax(0,1fr)] gap-3.5">
      <div className="text-muted-foreground flex flex-col items-end gap-0.5 pt-3 text-end text-[11.5px] tabular-nums">
        {dateLabel && <span className="text-foreground text-[12.5px] font-medium whitespace-nowrap">{dateLabel}</span>}
        {dateLabel && <span>{row.scheduledTime}</span>}
        {/* The Owner has not picked a Due Time (ADR 0029): nothing will send. */}
        {!row.scheduledDate && row.status !== 'cancelled' && <span>ללא תאריך</span>}
      </div>
      <div className={cn('bg-card min-w-0 overflow-hidden rounded-lg border border-s-[3px] shadow-xs', rail)}>
        <div className="flex flex-wrap items-center gap-3 px-3.5 py-3">
          <span className="text-muted-foreground shrink-0 [&_svg]:size-[18px]">
            {row.kind === 'call' ? <Phone /> : <MessageSquare />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{row.title}</h3>
            <p className="text-muted-foreground mt-0.5 truncate text-[12.5px]">
              {row.kind === 'call'
                ? row.roundId ? `התקשרנו ל-${row.calledCount} מתוך ${row.roundGuestCount} רשומות אורחים` : audienceLabel
                : row.status === 'cancelled' ? 'בוטל על ידי בעלי האירוע'
                  : `${channelLabel ? `${channelLabel} · ` : ''}${attempted ? `נשלחו ${successful.length} מתוך ${row.audienceCount}${failed.length ? `, ${failed.length} נכשלו` : ''}${includesManualResends ? ' · כולל שליחות חוזרות ידניות' : ''}` : audienceLabel}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn('rounded-full border px-2 py-px text-[10px] font-semibold uppercase', failed.length ? 'border-destructive/40 text-destructive' : 'text-muted-foreground')}>
              {TIMELINE_STATUS_LABELS[row.status]}
            </span>
            {row.status === 'planned' ? (
              sendingEnabled ? <QueueRowAction row={actionRow} /> : null
            ) : row.roundId ? (
              /*
               * A link, not a button: this navigates to the round, it does not do
               * anything to it. Only the planned row carries a button, because
               * Start is the one control here that changes the world.
               */
              <Button
                asChild
                variant="link"
                size="sm"
                className={cn(
                  'h-auto shrink-0 gap-0.5 px-0 text-[13px]',
                  row.status !== 'in_progress' && 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Link href={`/admin/events/${eventId}/rounds/${row.roundId}`}>
                  {row.status === 'in_progress' ? 'סיום הסבב' : 'פתיחת הסבב'}
                  <ChevronLeft className="size-3.5" />
                </Link>
              </Button>
            ) : null}
            <ScheduleControls row={row} sendingEnabled={sendingEnabled} />
          </div>
        </div>
        {failed.length > 0 && <DeliveryPanel scheduleId={row.id} failed={failed} successful={successful} attempted={attempted} embedded />}
        {failed.length === 0 && successful.length > 0 && (
          <Collapsible className="border-t">
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 px-3.5 py-2.5 text-[12px] font-medium">
              שליחות שהצליחו ({successful.length})
              {successfulChannels && (
                <span className="text-muted-foreground/80 font-normal">
                  {' '}
                  &middot; {successfulChannels}
                </span>
              )}{' '}
              <ChevronDown />
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-1 border-t px-3.5 py-2.5 text-[12px]">
              {successful.map((delivery) => <p key={delivery.id}>{delivery.guestName} · {deliveryStatusLabel(delivery.status)}</p>)}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

function DeliveryPanel({ scheduleId, failed, successful, attempted, embedded = false }: {
  scheduleId: string;
  failed: EventTimelineRow['deliveries'];
  successful: EventTimelineRow['deliveries'];
  attempted: number;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(() => new Set(failed.map((delivery) => delivery.guestId)));
  const successfulChannels = channelBreakdown(successful);
  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }
  function resend() {
    startTransition(async () => {
      const promise = sendSelectedDeliveriesAdmin(scheduleId, [...selected]).then((result) => {
        if (!result.success) throw new Error(result.message);
        return result;
      });
      toast.promise(promise, {
        loading: 'שולחים מחדש את השליחות שנבחרו',
        success: (result) => {
          setOpen(false);
          router.refresh();
          return result.message;
        },
        error: (error) => error instanceof Error ? error.message : 'השליחה החוזרת נכשלה',
      });
      try {
        await promise;
      } catch {
        // The toast owns the visible error state
      }
    });
  }
  return (
    <Collapsible defaultOpen id={`schedule-${scheduleId}-failures`} className={cn('scroll-mt-20 border-destructive/25 bg-destructive/5', embedded ? 'border-t' : 'mt-3 rounded-lg border')}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-start text-[12.5px] font-medium text-destructive">
        {failed.length} מתוך {attempted} ניסיונות שליחה נכשלו <ChevronDown />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-3 py-3">
        <div className="space-y-2">
          {failed.map((delivery) => (
            <DeliveryChoice key={delivery.id} delivery={delivery} selected={selected.has(delivery.guestId)} onToggle={toggle} />
          ))}
        </div>
        {successful.length > 0 && (
          <Collapsible className="mt-3 border-t pt-3">
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12px] font-medium">
              שליחות שהצליחו ({successful.length})
              {successfulChannels && (
                <span className="text-muted-foreground/80 font-normal">
                  {' '}
                  &middot; {successfulChannels}
                </span>
              )}{' '}
              <ChevronDown />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {successful.map((delivery) => (
                <DeliveryChoice key={delivery.id} delivery={delivery} selected={selected.has(delivery.guestId)} onToggle={toggle} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        <p className="text-muted-foreground mt-3 text-[11.5px]">
          שליחה חוזרת משתמשת בתבנית ובהגדרות הנוכחיות של האירוע. עד {MAX_MANUAL_RECIPIENTS} רשומות בכל פעם - שליחה גדולה יותר שייכת לתזמון
        </p>
        <Button type="button" size="sm" className="mt-3" disabled={!selected.size || selected.size > MAX_MANUAL_RECIPIENTS} onClick={() => setOpen(true)}>שליחה חוזרת לנבחרים ({selected.size})</Button>
        <SmsFallbackDialog scheduleId={scheduleId} />
      </CollapsibleContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>לשלוח שוב ל-{selected.size} הרשומות שנבחרו?</DialogTitle>
            <DialogDescription>ההודעות נשלחות מיד עם התבנית הנוכחית</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive"><TriangleAlert /><AlertTitle>ייתכנו הודעות כפולות</AlertTitle><AlertDescription>אפשר לבחור בכוונה גם שליחות שהצליחו. האורחים האלה יקבלו את ההודעה שוב</AlertDescription></Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>ביטול</Button>
            <Button variant="destructive" onClick={resend} disabled={pending || !selected.size}>לשלוח עכשיו</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

function DeliveryChoice({ delivery, selected, onToggle }: {
  delivery: EventTimelineRow['deliveries'][number];
  selected: boolean;
  onToggle: (guestId: string, checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-[12.5px]">
      <Checkbox checked={selected} onCheckedChange={(value) => onToggle(delivery.guestId, value === true)} />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{delivery.guestName}</span>
        <span className="text-muted-foreground ms-2">
          {delivery.guestPhone ?? 'אין טלפון'} · {deliveryStatusLabel(delivery.status)}
          {delivery.channel === 'sms' ? ' ב-SMS' : ''}
          {delivery.status === 'failed' && delivery.hasSmsAttempt ? ' · נוסה גם ב-SMS' : ''}
        </span>
        {delivery.errorMessage && <span className="text-destructive block">{delivery.errorMessage}</span>}
      </span>
    </label>
  );
}
