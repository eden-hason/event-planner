'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, Copy, ExternalLink, PhoneOff, TriangleAlert } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminDialogContent } from './admin-dialog';
import { QueueRowAction, type QueueActionRow } from './queue-row-action';
import { resendScheduleToSelected } from '@/features/schedules';
import type { EventGuestSummary, EventTimelineRow, EventWorkspaceSignal } from '../types';
import { formatScheduleDateTime } from '@/lib/date-time';
import { cn } from '@/lib/utils';

export function PublicEventActions({ shortCode }: { shortCode: string }) {
  const path = `/r/${shortCode}`;
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success('Guest page link copied');
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="bg-muted rounded px-2 py-1 text-[12px]">{path}</code>
      <Button type="button" variant="outline" size="xs" onClick={copy}><Copy data-icon="inline-start" />Copy</Button>
      <Button asChild variant="outline" size="xs"><Link href={path} target="_blank"><ExternalLink data-icon="inline-start" />Open guest page</Link></Button>
    </div>
  );
}

export function PhoneQualityDisclosure({ summary }: { summary: EventGuestSummary }) {
  if (!summary.unusablePhones.length) return null;
  return (
    <Collapsible>
      <Alert className="mt-4">
        <PhoneOff />
        <AlertTitle>{summary.unusablePhones.length} records have no usable phone number</AlertTitle>
        <AlertDescription>They cannot receive messages or be reached in a call round</AlertDescription>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="xs" className="absolute top-2 right-2">List them<ChevronDown data-icon="inline-end" /></Button>
        </CollapsibleTrigger>
      </Alert>
      <CollapsibleContent className="mt-2 overflow-hidden rounded-lg border">
        {summary.unusablePhones.map((guest) => (
          <div key={guest.id} className="flex items-center justify-between gap-4 border-b px-3 py-2 text-[12.5px] last:border-b-0">
            <span className="font-medium">{guest.name}</span>
            <span className="text-muted-foreground">{guest.groupName ?? 'No group'} · {guest.phone || 'No phone number'}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorkspaceSignals({ signals }: { signals: EventWorkspaceSignal[] }) {
  if (!signals.length) return null;
  const destructive = signals.some((signal) => signal.kind !== 'stale_call_round');
  const labels: Record<EventWorkspaceSignal['kind'], string> = {
    overdue_schedule: 'Overdue schedules',
    failed_delivery: 'Failed deliveries',
    stale_call_round: 'Stale call rounds',
  };
  const groups = signals.length > 6
    ? (Object.keys(labels) as EventWorkspaceSignal['kind'][])
      .map((kind) => ({ kind, rows: signals.filter((signal) => signal.kind === kind) }))
      .filter((group) => group.rows.length > 0)
    : null;
  const signalRow = (signal: EventWorkspaceSignal) => (
    <Link key={signal.id} href={signal.href} className="hover:bg-accent/50 flex items-center justify-between gap-5 border-t px-4 py-3">
      <span><span className="block text-[13.5px] font-medium">{signal.headline}</span><span className="text-muted-foreground text-[12px]">{signal.detail}</span></span>
      <span className="text-[12px] font-medium">Review</span>
    </Link>
  );
  return (
    <section className={cn('overflow-hidden rounded-xl border shadow-xs', destructive ? 'border-destructive/30 bg-destructive/5' : 'bg-card')}>
      <h2 className={cn('px-4 pt-3.5 pb-2.5 text-[11.5px] font-semibold tracking-[0.07em] uppercase', destructive ? 'text-destructive' : 'text-muted-foreground')}>
        {destructive ? 'Signals requiring attention' : 'Open work'}
      </h2>
      {groups ? groups.map((group) => (
        <div key={group.kind}>
          <p className="text-muted-foreground border-t px-4 py-2 text-[10.5px] font-semibold tracking-[0.06em] uppercase">{labels[group.kind]}</p>
          {group.rows.slice(0, 4).map(signalRow)}
          {group.rows.length > 4 && (
            <Link href="#outreach-timeline" className="text-muted-foreground hover:text-foreground block border-t px-4 py-2.5 text-[12px] font-medium">
              {group.rows.length - 4} more in outreach
            </Link>
          )}
        </div>
      )) : signals.map(signalRow)}
    </section>
  );
}

export function EventTimeline({ rows }: { rows: EventTimelineRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="divide-y border-t">
      {rows.map((row) => <TimelineRow key={row.id} row={row} />)}
    </div>
  );
}

function TimelineRow({ row }: { row: EventTimelineRow }) {
  const failed = row.deliveries.filter((delivery) => delivery.status === 'failed');
  const successful = row.deliveries.filter((delivery) => delivery.status === 'sent');
  const attempted = row.deliveries.length;
  const includesManualResends = row.deliveries.some((delivery) => delivery.triggeredBy === 'manual')
    && row.deliveries.some((delivery) => delivery.triggeredBy === 'scheduled');
  const audienceLabel = `${row.audienceCount} ${row.targetStatus ?? 'guest'} ${row.audienceCount === 1 ? 'record' : 'records'}`;
  const actionRow: QueueActionRow = {
    id: row.id,
    kind: row.kind,
    title: row.title,
    audienceLabel,
    channel: row.channel === 'whatsapp' ? 'WhatsApp' : row.channel === 'sms' ? 'SMS' : null,
  };
  return (
    <div id={`schedule-${row.id}`} className="grid scroll-mt-20 grid-cols-[130px_minmax(0,1fr)] gap-5 px-4 py-4">
      <div className="text-muted-foreground text-[12px] tabular-nums">
        <span className="text-foreground block font-medium">{formatScheduleDateTime(row.scheduledDate, row.scheduledTime).split(',')[0]}</span>
        <span>{row.scheduledTime?.slice(0, 5) ?? 'No time'}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13.5px] font-semibold">{row.title}</h3>
              <span className={cn('rounded-full border px-2 py-px text-[10px] font-semibold uppercase', failed.length ? 'border-destructive/40 text-destructive' : 'text-muted-foreground')}>
                {row.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[12.5px]">
              {row.kind === 'call'
                ? row.roundId ? `${row.calledCount} of ${row.roundGuestCount} guest records called` : audienceLabel
                : row.status === 'cancelled' ? 'Cancelled by owner'
                  : attempted ? `${successful.length} sent${failed.length ? `, ${failed.length} failed` : ''}${includesManualResends ? ' · Includes manual resends' : ''}` : audienceLabel}
            </p>
          </div>
          {row.status === 'planned' ? (
            <QueueRowAction row={actionRow} />
          ) : row.roundId ? (
            <Button asChild variant={row.status === 'in_progress' ? 'default' : 'outline'} size="sm">
              <Link href={`rounds/${row.roundId}`}>{row.status === 'in_progress' ? 'Complete round' : 'Open round'}</Link>
            </Button>
          ) : null}
        </div>

        {failed.length > 0 && (
          <DeliveryPanel scheduleId={row.id} failed={failed} successful={successful} attempted={attempted} />
        )}
        {failed.length === 0 && successful.length > 0 && (
          <Collapsible className="mt-3">
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12px] font-medium">
              Successful deliveries ({successful.length}) <ChevronDown />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1 text-[12px]">
              {successful.map((delivery) => <p key={delivery.id}>{delivery.guestName} · {delivery.status}</p>)}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

function DeliveryPanel({ scheduleId, failed, successful, attempted }: {
  scheduleId: string;
  failed: EventTimelineRow['deliveries'];
  successful: EventTimelineRow['deliveries'];
  attempted: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(() => new Set(failed.map((delivery) => delivery.guestId)));
  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }
  function resend() {
    startTransition(async () => {
      const promise = resendScheduleToSelected(scheduleId, [...selected]).then((result) => {
        if (!result.success) throw new Error(result.message);
        return result;
      });
      toast.promise(promise, {
        loading: 'Resending selected deliveries',
        success: (result) => {
          setOpen(false);
          router.refresh();
          return `${result.sentCount ?? 0} deliveries sent`;
        },
        error: (error) => error instanceof Error ? error.message : 'Resend failed',
      });
      try {
        await promise;
      } catch {
        // The toast owns the visible error state
      }
    });
  }
  return (
    <Collapsible defaultOpen id={`schedule-${scheduleId}-failures`} className="mt-3 scroll-mt-20 rounded-lg border border-destructive/25 bg-destructive/5">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] font-medium text-destructive">
        {failed.length} of {attempted} attempted deliveries failed <ChevronDown />
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
              Successful deliveries ({successful.length}) <ChevronDown />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {successful.map((delivery) => (
                <DeliveryChoice key={delivery.id} delivery={delivery} selected={selected.has(delivery.guestId)} onToggle={toggle} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        <p className="text-muted-foreground mt-3 text-[11.5px]">Resends use the event&apos;s current template and configuration</p>
        <Button type="button" size="sm" className="mt-3" disabled={!selected.size} onClick={() => setOpen(true)}>Resend selected ({selected.size})</Button>
      </CollapsibleContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <AdminDialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Resend to {selected.size} selected records?</DialogTitle>
            <DialogDescription>Messages are sent immediately using the current template</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive"><TriangleAlert /><AlertTitle>Possible duplicate messages</AlertTitle><AlertDescription>Successful deliveries can be selected deliberately. Those guests will receive this message again</AlertDescription></Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button variant="destructive" onClick={resend} disabled={pending || !selected.size}>Resend now</Button>
          </DialogFooter>
        </AdminDialogContent>
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
        <span className="text-muted-foreground ml-2">{delivery.guestPhone ?? 'No phone'} · {delivery.status}</span>
        {delivery.errorMessage && <span className="text-destructive block">{delivery.errorMessage}</span>}
      </span>
    </label>
  );
}
