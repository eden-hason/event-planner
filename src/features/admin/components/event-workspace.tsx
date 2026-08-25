import { CalendarDays, MapPin, Users } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddCallRoundDialog } from './add-call-round-dialog';
import { Band, BandRow } from './band';
import {
  EventTimeline,
  PhoneQualityDisclosure,
  PublicEventActions,
  WorkspaceSignals,
} from './event-workspace-client';
import { RetryButton } from './retry-button';
import {
  getEventGuestSummary,
  getEventIdentity,
  getEventSignals,
  getEventTimeline,
} from '../queries/events';
import type { EventIdentity } from '../types';
import { formatEventDate, relativeEventDate } from '@/lib/date-time';

export function EventIdentityBand({ event }: { event: EventIdentity }) {
  const hosts = event.hostNames.length ? event.hostNames.join(' & ') : null;
  if (event.status === 'draft') {
    return (
      <Band title="Event">
        <BandRow className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{event.title}</h1>
              <Badge variant="outline" className="text-muted-foreground text-[10px] uppercase">Draft</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-[13px]">{event.eventTypeName}{hosts ? ` · ${hosts}` : ''}</p>
            <p className="text-muted-foreground mt-3 text-[12.5px]">{formatEventDate(event.eventDate)} · {event.locationName ?? 'No venue set'}</p>
          </div>
          <div className="text-right text-[12.5px]">
            <p className="font-medium">{event.owner.name}</p>
            <p className="text-muted-foreground">{event.owner.email ?? 'No email'}</p>
          </div>
        </BandRow>
      </Band>
    );
  }
  return (
    <Band title="Event">
      <BandRow className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,.65fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{event.title}</h1>
            <Badge variant="outline" className="text-muted-foreground text-[10px] uppercase">Published</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-[13px]">{event.eventTypeName}{hosts ? ` · ${hosts}` : ''}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Detail icon={<CalendarDays />} label="Date" value={formatEventDate(event.eventDate)} supporting={relativeEventDate(event.daysFromToday)} />
            <Detail icon={<MapPin />} label="Venue" value={event.locationName ?? 'No venue set'} />
            <Detail label="Ceremony" value={event.ceremonyTime?.slice(0, 5) ?? 'Not set'} />
            <Detail label="Reception" value={event.receptionTime?.slice(0, 5) ?? 'Not set'} />
          </div>
          {event.status === 'published' && event.shortCode && <div className="mt-4"><PublicEventActions shortCode={event.shortCode} /></div>}
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">Owner</p>
          <p className="mt-2 text-[13.5px] font-medium">{event.owner.name}</p>
          <p className="text-muted-foreground text-[12px]">{event.owner.email ?? 'No email'}</p>
          <p className="text-muted-foreground text-[12px]">{event.owner.phone ?? 'No phone number'}</p>
          {event.collaborators.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">Collaborators</p>
              {event.collaborators.map((person) => <p key={person.id} className="mt-1 text-[12px]">{person.name} · {person.role}</p>)}
            </div>
          )}
        </div>
      </BandRow>
    </Band>
  );
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
    <Band title="Draft event">
      <BandRow>
        <Alert>
          <Users />
          <AlertTitle>Onboarding is incomplete</AlertTitle>
          <AlertDescription>
            Onboarding stopped after {event.onboardingStep ?? 'an unknown step'}. Outreach and guest-list operations are unavailable until the owner publishes the event
          </AlertDescription>
        </Alert>
      </BandRow>
    </Band>
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
            <BandRow>
              <div className="grid gap-4 sm:grid-cols-4">
                <Metric value={summary.guestRecords} label="guest records" supporting={`${summary.actualGuests} actual guests`} />
                <Metric value={summary.groups} label="groups" supporting={`${summary.offlineRecords} offline RSVPs`} />
                <Metric value={summary.confirmed} label="confirmed" supporting={`${Math.round(summary.confirmed / summary.guestRecords * 100)}% of records`} />
                <Metric value={summary.pending} label="pending" supporting={`${summary.declined} declined`} />
              </div>
              <PhoneQualityDisclosure summary={summary} />
            </BandRow>
            {summary.provenance.length > 0 && (
              <BandRow className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead className="px-4">RSVP provenance</TableHead><TableHead className="text-right">Confirmed</TableHead><TableHead className="text-right">Declined</TableHead><TableHead className="px-4 text-right">Records</TableHead></TableRow></TableHeader>
                  <TableBody>{summary.provenance.map((row) => <TableRow key={row.label}><TableCell className="px-4 font-medium">{row.label}</TableCell><TableCell className="text-right tabular-nums">{row.confirmed}</TableCell><TableCell className="text-right tabular-nums">{row.declined}</TableCell><TableCell className="px-4 text-right tabular-nums">{row.total}</TableCell></TableRow>)}</TableBody>
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
  return <div><p className="text-xl font-semibold tabular-nums">{value.toLocaleString('en-GB')}</p><p className="text-[12.5px] font-medium">{label}</p><p className="text-muted-foreground text-[11.5px]">{supporting}</p></div>;
}

export async function EventOutreachBand({ eventId }: { eventId: string }) {
  try {
    const event = await getEventIdentity(eventId);
    if (!event) return <BandFailure title="Outreach timeline" />;
    if (!event.canCreateSchedules) {
      return (
        <Band id="outreach-timeline" title="Outreach timeline" className="scroll-mt-20">
          <BandRow>
            <Alert id="outreach-gate"><AlertTitle>Sending is not enabled for this event</AlertTitle><AlertDescription>Outreach remains unavailable until payment is completed and Kululu enables sending</AlertDescription></Alert>
          </BandRow>
        </Band>
      );
    }
    const [rows, guestSummary] = await Promise.all([getEventTimeline(event.id), getEventGuestSummary(event.id)]);
    const canPlanCalls = guestSummary.pending + guestSummary.confirmed > 0;
    return (
      <Band id="outreach-timeline" title="Outreach timeline" className="scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-muted-foreground text-[12.5px]">Messages and call rounds in planned order</p>
          {canPlanCalls && <AddCallRoundDialog events={[{ id: event.id, title: event.title, pending: guestSummary.pending, confirmed: guestSummary.confirmed }]} eventId={event.id} />}
        </div>
        {rows.length ? (
          <EventTimeline rows={rows} />
        ) : (
          <BandRow>
            <Empty className="min-h-44 border-0 p-4"><EmptyHeader><EmptyTitle>No outreach planned</EmptyTitle><EmptyDescription>{canPlanCalls ? 'Add a call round or wait for the owner to configure messages' : 'Outreach can be planned as soon as the guest list has an eligible audience'}</EmptyDescription></EmptyHeader></Empty>
          </BandRow>
        )}
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
      <BandRow className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
