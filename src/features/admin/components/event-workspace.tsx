import { CalendarDays, Clock3, Info, MapPin, Users } from '@/components/icons';
import { formatPhone } from '@/lib/phone';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddCallRoundDialog } from './add-call-round-dialog';
import { Band, BandRow } from './band';
import { EnableSendingButton } from './enable-sending-button';
import {
  EventTimeline,
  PhoneQualityDisclosure,
  PublicEventActions,
  WorkspaceSignals,
} from './event-workspace-client';
import { BatchSendDialog } from './batch-send-dialog';
import { QuickSendDialog } from './quick-send-dialog';
import { RetryButton } from './retry-button';
import {
  getEventGuestSummary,
  getEventIdentity,
  getEventSignals,
  getEventTimeline,
} from '../queries/events';
import type { EventGuestSummary, EventIdentity } from '../types';
import { formatEventDate, relativeEventDate } from '@/lib/date-time';
import { cn } from '@/lib/utils';

export function EventIdentityBand({ event }: { event: EventIdentity }) {
  const hosts = event.hostNames.length ? event.hostNames.join(' and ') : null;
  const eventDate = formatEventDate(event.eventDate, { weekday: true });
  const relativeDate = relativeEventDate(event.daysFromToday, { futureStyle: 'in' });

  if (event.status === 'draft') {
    return (
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-3 px-5 py-[18px]">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-muted-foreground min-w-0 truncate text-xl font-semibold tracking-[-0.015em]">{event.title}</h1>
            <Badge variant="secondary" className="text-primary bg-primary/10 text-[11px] tracking-[0.04em] uppercase">Draft</Badge>
            <Badge variant="outline" className="text-muted-foreground text-[11px] tracking-[0.04em] uppercase">{event.eventTypeName}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <EventMeta icon={<CalendarDays />}>
              <span className="font-medium tabular-nums">{eventDate}</span>
              {relativeDate && <span className="text-muted-foreground tabular-nums">{relativeDate}</span>}
            </EventMeta>
            <EventMeta icon={<MapPin />} muted={!event.locationName}>
              <span className="truncate">{event.locationName ?? 'No venue yet'}</span>
            </EventMeta>
          </div>
          <Separator />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.07em] uppercase">Owner</p>
            <p className="mt-1 truncate text-[13.5px]">{event.owner.email ?? event.owner.name}</p>
            <p className="text-muted-foreground font-mono text-[12.5px] tabular-nums">{event.owner.phone ? formatPhone(event.owner.phone) : 'No phone number'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="grid gap-0 overflow-hidden py-0 lg:grid-cols-[minmax(0,1fr)_268px]">
      <CardContent className="flex min-w-0 flex-col gap-3 px-5 py-[18px]">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 truncate text-xl font-semibold tracking-[-0.015em]">{event.title}</h1>
            <Badge variant="outline" className="text-muted-foreground shrink-0 text-[11px] tracking-[0.04em] uppercase">{event.eventTypeName}</Badge>
          </div>
          {hosts && <p className="text-foreground/80 truncate text-[13.5px]">{hosts}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <EventMeta icon={<CalendarDays />}>
            <span className="font-medium tabular-nums">{eventDate}</span>
            {relativeDate && <span className="text-muted-foreground tabular-nums">{relativeDate}</span>}
          </EventMeta>
          <EventMeta icon={<MapPin />} muted={!event.locationName}>
            <span className="truncate">{event.locationName ?? 'No venue yet'}</span>
          </EventMeta>
          <EventMeta icon={<Clock3 />}>
            <span className="tabular-nums">
              Ceremony {event.ceremonyTime?.slice(0, 5) ?? 'not set'} · Reception {event.receptionTime?.slice(0, 5) ?? 'not set'}
            </span>
          </EventMeta>
        </div>

        {event.shortCode && <PublicEventActions shortCode={event.shortCode} />}
      </CardContent>

      <CardContent className="flex min-w-0 flex-col gap-3 border-t px-5 py-[18px] lg:border-t-0 lg:border-l">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.07em] uppercase">Owner</p>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium">{event.owner.name}</p>
          <p className="text-muted-foreground truncate text-[12.5px]">{event.owner.email ?? 'No email'}</p>
          <p className="text-muted-foreground font-mono text-[12.5px] tabular-nums">{event.owner.phone ? formatPhone(event.owner.phone) : 'No phone number'}</p>
        </div>
        {event.collaborators.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-xs">Also on this event</p>
              {event.collaborators.map((person) => (
                <div key={person.id} className="flex min-w-0 flex-wrap items-baseline gap-2">
                  <span className="truncate text-[13px]">{person.name}</span>
                  <Badge variant="outline" className="text-muted-foreground px-2 py-0 text-[11.5px] font-normal normal-case">
                    {formatCollaboratorRole(person.role)}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EventMeta({
  icon,
  children,
  muted = false,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={muted ? 'text-muted-foreground flex min-w-0 items-center gap-2' : 'flex min-w-0 items-center gap-2'}>
      <span className="text-muted-foreground shrink-0 [&_svg]:size-[18px]">{icon}</span>
      <span className="flex min-w-0 items-baseline gap-2 text-[13.5px]">{children}</span>
    </div>
  );
}

function formatCollaboratorRole(role: string) {
  const words = role.replaceAll('_', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function EventIdentityQueryBand({ eventId }: { eventId: string }) {
  try {
    const event = await getEventIdentity(eventId);
    return event ? <EventIdentityBand event={event} /> : <BandFailure title="Event" />;
  } catch (error) {
    console.error('Event identity failed:', error);
    return <BandFailure title="Event" />;
  }
}

function Detail({ icon, label, value, supporting }: { icon?: React.ReactNode; label: string; value: string; supporting?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-muted-foreground mt-0.5 [&_svg]:size-4">{icon}</span>}
      <span><span className="text-muted-foreground block text-[11.5px]">{label}</span><span className="text-[13px] font-medium">{value}</span>{supporting && <span className="text-muted-foreground ml-1.5 text-[12px]">{supporting}</span>}</span>
    </div>
  );
}

export function DraftEventBand({ event }: { event: EventIdentity }) {
  return (
    <Alert className="p-5">
      <Info />
      <AlertTitle>Onboarding was never finished, so there is nothing to work yet</AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        <span>A draft has no guest list, no schedules and no workspace in the owner app. The owner is reachable above if this one is worth a call</span>
        <span className="text-muted-foreground/70 text-xs tabular-nums">Created {formatEventDate(event.createdAt)}, onboarding stopped after {event.onboardingStep ?? 'an unknown step'}</span>
      </AlertDescription>
    </Alert>
  );
}

export async function DraftEventQueryBand({ eventId }: { eventId: string }) {
  try {
    const event = await getEventIdentity(eventId);
    return event ? <DraftEventBand event={event} /> : <BandFailure title="Draft event" />;
  } catch (error) {
    console.error('Draft event state failed:', error);
    return <BandFailure title="Draft event" />;
  }
}

export async function EventSignalsBand({ eventId, outreachEnabled = true }: { eventId: string; outreachEnabled?: boolean }) {
  try {
    const signals = await getEventSignals(eventId);
    return <WorkspaceSignals signals={outreachEnabled ? signals : signals.map((signal) => ({ ...signal, href: '#outreach-gate' }))} />;
  } catch (error) {
    console.error('Event signals failed:', error);
    return <BandFailure title="Signals" />;
  }
}

export async function EventGuestListBand({ eventId }: { eventId: string }) {
  try {
    const summary = await getEventGuestSummary(eventId);
    return (
      <Band title="Guest list">
        {summary.guestRecords === 0 ? (
          <BandRow>
            <Empty className="min-h-48 border-0 p-4">
              <EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>No guest list yet</EmptyTitle><EmptyDescription>Guest records will appear here after the owner adds or imports them</EmptyDescription></EmptyHeader>
            </Empty>
          </BandRow>
        ) : (
          <>
            <BandRow className="flex flex-wrap items-baseline gap-x-9 gap-y-5">
              <Metric value={summary.guestRecords} label="guest records" supporting="the billable unit" />
              <Metric value={summary.actualGuests} label="guests" supporting="actual humans invited" />
              <Metric value={summary.groups} label="groups" supporting="grouped guest records" />
            </BandRow>
            <BandRow className="flex flex-col gap-3">
              <RsvpBar summary={summary} />
              <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
                <RsvpLegend color="bg-rsvp-confirmed" value={summary.confirmed} label="confirmed" total={summary.guestRecords} />
                <RsvpLegend color="bg-rsvp-declined" value={summary.declined} label="declined" total={summary.guestRecords} />
                <RsvpLegend color="bg-rsvp-pending" value={summary.pending} label="pending" total={summary.guestRecords} />
              </div>
            </BandRow>
            {summary.unusablePhones.length > 0 && <BandRow><PhoneQualityDisclosure summary={summary} /></BandRow>}
            {summary.confirmed + summary.declined > 0 && (
              <BandRow className="bg-muted flex flex-col gap-2.5 py-3.5">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.07em] uppercase">Where the answers came from</p>
                  <p className="text-foreground/80 text-[12.5px] tabular-nums">
                    {operatorAnswers(summary)} of {summary.confirmed + summary.declined} answers came from Kululu operators on the phone
                  </p>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead className="px-0">Source</TableHead><TableHead className="w-24 text-right">Confirmed</TableHead><TableHead className="w-24 px-0 text-right">Declined</TableHead></TableRow></TableHeader>
                  <TableBody>{summary.provenance.filter((row) => row.confirmed + row.declined > 0).map((row) => <TableRow key={row.label}><TableCell className="px-0 text-[13px]">{provenanceLabel(row.label)}</TableCell><TableCell className="text-right text-[13px] tabular-nums">{row.confirmed}</TableCell><TableCell className="px-0 text-right text-[13px] tabular-nums">{row.declined}</TableCell></TableRow>)}</TableBody>
                </Table>
              </BandRow>
            )}
          </>
        )}
      </Band>
    );
  } catch (error) {
    console.error('Event guest list failed:', error);
    return <BandFailure title="Guest list" />;
  }
}

function Metric({ value, label, supporting }: { value: number; label: string; supporting: string }) {
  return <div className="flex flex-col gap-0.5"><p className="text-xl font-semibold tracking-[-0.01em] tabular-nums">{value.toLocaleString('en-GB')} {label}</p><p className="text-muted-foreground text-[12.5px]">{supporting}</p></div>;
}

function RsvpBar({ summary }: { summary: EventGuestSummary }) {
  const total = summary.confirmed + summary.declined + summary.pending;
  if (!total) return null;
  return (
    <div className="bg-border flex h-2.5 overflow-hidden rounded-full" aria-label="RSVP status distribution">
      <div className="bg-rsvp-confirmed" style={{ width: `${summary.confirmed / total * 100}%` }} />
      <div className="bg-rsvp-declined" style={{ width: `${summary.declined / total * 100}%` }} />
      <div className="bg-rsvp-pending" style={{ width: `${summary.pending / total * 100}%` }} />
    </div>
  );
}

function RsvpLegend({
  color,
  value,
  label,
  total,
}: {
  color: 'bg-rsvp-confirmed' | 'bg-rsvp-declined' | 'bg-rsvp-pending';
  value: number;
  label: string;
  total: number;
}) {
  const percent = total ? Math.round(value / total * 100) : 0;
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn('size-2 shrink-0 rounded-full', color)} />
      <span className="text-sm font-semibold tabular-nums">{value.toLocaleString('en-GB')}</span>
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <span className="text-muted-foreground/70 text-[12.5px] tabular-nums">{percent}%</span>
    </div>
  );
}

function operatorAnswers(summary: EventGuestSummary) {
  const operator = summary.provenance.find((row) => row.label === 'Back Office call');
  return operator ? operator.confirmed + operator.declined : 0;
}

function provenanceLabel(label: string) {
  const labels: Record<string, string> = {
    'Guest response': 'Guest self-served the link',
    'Back Office call': 'Operator on the phone',
    'Owner update': 'Owner typed it in',
    'Before source tracking': 'Before this was tracked',
  };
  return labels[label] ?? label;
}

export async function EventOutreachBand({ eventId }: { eventId: string }) {
  try {
    const event = await getEventIdentity(eventId);
    if (!event) return <BandFailure title="Outreach timeline" />;
    if (!event.canCreateSchedules) {
      return (
        <Band id="outreach-timeline" title="Outreach timeline" className="scroll-mt-20">
          <BandRow>
            <Item id="outreach-gate" variant="muted">
              <ItemContent>
                <ItemTitle>Sending is not enabled for this event</ItemTitle>
                <ItemDescription>Outreach remains unavailable until payment is completed and Kululu enables sending</ItemDescription>
              </ItemContent>
              <ItemActions><EnableSendingButton eventId={event.id} /></ItemActions>
            </Item>
          </BandRow>
        </Band>
      );
    }
    const [rows, guestSummary] = await Promise.all([getEventTimeline(event.id), getEventGuestSummary(event.id)]);
    const canPlanCalls = guestSummary.pending + guestSummary.confirmed > 0;
    // Cancelled messages are excluded: the schedule was called off, and a
    // one-off send of it is the Operator resurrecting a decision, not helping a
    // guest. Status is otherwise ignored - a planned message is exactly what a
    // guest on the phone is usually asking for early.
    const sendableMessages = rows
      .filter((row) => row.kind === 'message' && row.status !== 'cancelled')
      .map((row) => ({ id: row.id, title: row.title, scheduledDate: row.scheduledDate, status: row.status }));
    return (
      <Band
        id="outreach-timeline"
        title="Outreach timeline"
        className="scroll-mt-20"
        action={(sendableMessages.length > 0 || canPlanCalls) ? (
          <div className="flex shrink-0 gap-2">
            {sendableMessages.length > 0 && <BatchSendDialog schedules={sendableMessages} />}
            {sendableMessages.length > 0 && <QuickSendDialog schedules={sendableMessages} />}
            {canPlanCalls && <AddCallRoundDialog events={[{ id: event.id, title: event.title, pending: guestSummary.pending, confirmed: guestSummary.confirmed }]} eventId={event.id} />}
          </div>
        ) : null}
      >
        <BandRow>
          {rows.length ? (
            <EventTimeline rows={rows} eventId={event.id} />
          ) : (
            <Empty className="min-h-44 border-0 p-4"><EmptyHeader><EmptyTitle>No outreach planned</EmptyTitle><EmptyDescription>{canPlanCalls ? 'Add a call round or wait for the owner to configure messages' : 'Outreach can be planned as soon as the guest list has an eligible audience'}</EmptyDescription></EmptyHeader></Empty>
          )}
        </BandRow>
      </Band>
    );
  } catch (error) {
    console.error('Event outreach failed:', error);
    return <BandFailure title="Outreach timeline" />;
  }
}

export function EventDetailsBand({ event }: { event: EventIdentity }) {
  return (
    <Band title="Event details">
      <BandRow className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Created" value={formatEventDate(event.createdAt)} />
        <Detail label="Sending" value={event.canCreateSchedules ? 'Enabled' : 'Not enabled'} />
        <Detail label="Guest page code" value={event.shortCode || 'Not assigned'} />
        <Detail label="Collaborators" value={String(event.collaborators.length)} />
      </BandRow>
    </Band>
  );
}

export async function EventDetailsQueryBand({ eventId }: { eventId: string }) {
  try {
    const event = await getEventIdentity(eventId);
    return event ? <EventDetailsBand event={event} /> : <BandFailure title="Event details" />;
  } catch (error) {
    console.error('Event details failed:', error);
    return <BandFailure title="Event details" />;
  }
}

export function EventBandSkeleton() {
  return <div className="bg-card rounded-xl border p-4"><Skeleton className="mb-4 h-3 w-28" /><Skeleton className="h-24 w-full" /></div>;
}

function BandFailure({ title }: { title: string }) {
  return <Band title={title}><BandRow className="flex items-center justify-between gap-4"><div><p className="text-[13.5px] font-medium">This section didn&apos;t load</p><p className="text-muted-foreground text-[12px]">Other event information is still available</p></div><RetryButton /></BandRow></Band>;
}
