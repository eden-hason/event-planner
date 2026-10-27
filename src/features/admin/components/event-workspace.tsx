import { CalendarDays, Clock3, Info, MapPin, Users } from '@/components/icons';
import { formatPhone } from '@/lib/phone';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddCallRoundDialog } from './add-call-round-dialog';
import { LateGuestsDialog } from './late-guests-dialog';
import { Band, BandRow } from './band';
import {
  BILLING_STATUS_LABELS,
  EventBillingStatusControl,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  RECORD_PACKAGE_CHANNEL_LABELS,
} from '@/features/billing';
import { BonusOverrideDialog } from './bonus-override-dialog';
import { RecordPaymentDialog } from './record-payment-dialog';
import { getEventRecordPackage } from '../queries/record-package';
import {
  EventTimeline,
  PhoneQualityDisclosure,
  PublicEventActions,
  WorkspaceSignals,
} from './event-workspace-client';
import { RetryButton } from './retry-button';
import { VenueNameDialog } from './venue-name-dialog';
import {
  getEventGuestSummary,
  getEventIdentity,
  getEventSignals,
  getEventTimeline,
} from '../queries/events';
import type { EventGuestSummary, EventIdentity } from '../types';
import { formatEventDate, formatShortDate, relativeEventDate } from '../utils/format';
import { countLabel, rsvpLabel } from '../utils/labels';
import { cn } from '@/lib/utils';
import { rsvpPresentation, type RsvpStatus } from '@/features/guests';

export function EventIdentityBand({ event }: { event: EventIdentity }) {
  const hosts = event.hostNames.length ? event.hostNames.join(' ו') : null;
  const eventDate = formatEventDate(event.eventDate, { weekday: true });
  const relativeDate = relativeEventDate(event.daysFromToday);

  if (event.status === 'draft') {
    return (
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-3 px-5 py-[18px]">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-muted-foreground min-w-0 truncate text-xl font-semibold tracking-[-0.015em]">{event.title}</h1>
            <Badge variant="secondary" className="text-primary bg-primary/10 text-[11px] tracking-[0.04em] uppercase">טיוטה</Badge>
            <Badge variant="outline" className="text-muted-foreground text-[11px] tracking-[0.04em] uppercase">{event.eventTypeName}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <EventMeta icon={<CalendarDays />}>
              <span className="font-medium tabular-nums">{eventDate}</span>
              {relativeDate && <span className="text-muted-foreground tabular-nums">{relativeDate}</span>}
            </EventMeta>
            <EventMeta icon={<MapPin />} muted={!event.locationName}>
              <span className="truncate">{event.locationName ?? 'עדיין אין מקום'}</span>
              <VenueNameDialog eventId={event.id} locationName={event.locationName} />
            </EventMeta>
          </div>
          <Separator />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.07em] uppercase">בעלים</p>
            <p className="mt-1 truncate text-[13.5px]">{event.owner.email ?? event.owner.name}</p>
            <p className="text-muted-foreground font-mono text-[12.5px] tabular-nums">{event.owner.phone ? formatPhone(event.owner.phone) : 'אין מספר טלפון'}</p>
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
          {hosts && (
            <p className="text-foreground/80 truncate text-[13.5px]">
              <span className="text-muted-foreground">{event.hostNames.length > 1 ? 'מארחים: ' : 'מארח: '}</span>
              {hosts}
            </p>
          )}
          {event.parentNames.length > 0 && (
            <p className="text-muted-foreground truncate text-[12.5px]">
              הורים: {event.parentNames.join(' · ')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <EventMeta icon={<CalendarDays />}>
            <span className="font-medium tabular-nums">{eventDate}</span>
            {relativeDate && <span className="text-muted-foreground tabular-nums">{relativeDate}</span>}
          </EventMeta>
          <EventMeta icon={<MapPin />} muted={!event.locationName}>
            <span className="truncate">{event.locationName ?? 'עדיין אין מקום'}</span>
            <VenueNameDialog eventId={event.id} locationName={event.locationName} />
          </EventMeta>
          <EventMeta icon={<Clock3 />}>
            <span className="tabular-nums">
              חופה {event.ceremonyTime?.slice(0, 5) ?? 'לא נקבע'} · קבלת פנים {event.receptionTime?.slice(0, 5) ?? 'לא נקבע'}
            </span>
          </EventMeta>
        </div>

        {event.shortCode && <PublicEventActions shortCode={event.shortCode} />}
      </CardContent>

      <CardContent className="flex min-w-0 flex-col gap-3 border-t px-5 py-[18px] lg:border-t-0 lg:border-l">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.07em] uppercase">בעלים</p>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium">{event.owner.name}</p>
          <p className="text-muted-foreground truncate text-[12.5px]">{event.owner.email ?? 'אין אימייל'}</p>
          <p className="text-muted-foreground font-mono text-[12.5px] tabular-nums">{event.owner.phone ? formatPhone(event.owner.phone) : 'אין מספר טלפון'}</p>
        </div>
        {event.collaborators.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-xs">שותפים נוספים באירוע</p>
              {event.collaborators.map((person) => (
                <span key={person.id} className="truncate text-[13px]">
                  {person.name}
                </span>
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

export async function EventIdentityQueryBand({ eventId }: { eventId: string }) {
  try {
    const event = await getEventIdentity(eventId);
    return event ? <EventIdentityBand event={event} /> : <BandFailure title="אירוע" />;
  } catch (error) {
    console.error('Event identity failed:', error);
    return <BandFailure title="אירוע" />;
  }
}

function Detail({ icon, label, value, supporting }: { icon?: React.ReactNode; label: string; value: string; supporting?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-muted-foreground mt-0.5 [&_svg]:size-4">{icon}</span>}
      <span><span className="text-muted-foreground block text-[11.5px]">{label}</span><span className="text-[13px] font-medium">{value}</span>{supporting && <span className="text-muted-foreground ms-1.5 text-[12px]">{supporting}</span>}</span>
    </div>
  );
}

export function DraftEventBand({ event }: { event: EventIdentity }) {
  return (
    <Alert className="p-5">
      <Info />
      <AlertTitle>ההרשמה לא הושלמה, כך שעדיין אין על מה לעבוד</AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        <span>לטיוטה אין רשימת אורחים, אין תזמונים ואין סביבת עבודה באפליקציה. פרטי הבעלים מופיעים למעלה אם שווה להתקשר</span>
        <span className="text-muted-foreground/70 text-xs tabular-nums">נוצר ב-{formatEventDate(event.createdAt)}, ההרשמה נעצרה אחרי {event.onboardingStep ?? 'שלב לא ידוע'}</span>
      </AlertDescription>
    </Alert>
  );
}

export async function DraftEventQueryBand({ eventId }: { eventId: string }) {
  try {
    const event = await getEventIdentity(eventId);
    return event ? <DraftEventBand event={event} /> : <BandFailure title="אירוע בטיוטה" />;
  } catch (error) {
    console.error('Draft event state failed:', error);
    return <BandFailure title="אירוע בטיוטה" />;
  }
}

export async function EventSignalsBand({ eventId, outreachEnabled = true }: { eventId: string; outreachEnabled?: boolean }) {
  try {
    const signals = await getEventSignals(eventId);
    return <WorkspaceSignals signals={outreachEnabled ? signals : signals.map((signal) => ({ ...signal, href: '#outreach-gate' }))} />;
  } catch (error) {
    console.error('Event signals failed:', error);
    return <BandFailure title="התראות" />;
  }
}

export async function EventGuestListBand({ eventId }: { eventId: string }) {
  try {
    const summary = await getEventGuestSummary(eventId);
    return (
      <Band title="רשימת אורחים">
        {summary.guestRecords === 0 ? (
          <BandRow>
            <Empty className="min-h-48 border-0 p-4">
              <EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>עדיין אין רשימת אורחים</EmptyTitle><EmptyDescription>רשומות האורחים יופיעו כאן אחרי שבעלי האירוע יוסיפו או ייבאו אותן</EmptyDescription></EmptyHeader>
            </Empty>
          </BandRow>
        ) : (
          <>
            <BandRow className="flex flex-wrap items-baseline gap-x-9 gap-y-5">
              <Metric value={summary.guestRecords} label="רשומות אורחים" supporting="יחידת החיוב" />
              <Metric value={summary.actualGuests} label="אורחים" supporting="אנשים שהוזמנו בפועל" />
              <Metric value={summary.groups} label="קבוצות" supporting="רשומות אורחים מקובצות" />
            </BandRow>
            <BandRow className="flex flex-col gap-3">
              <RsvpBar summary={summary} />
              <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
                <RsvpLegend status="confirmed" value={summary.confirmed} total={summary.guestRecords} />
                <RsvpLegend status="declined" value={summary.declined} total={summary.guestRecords} />
                <RsvpLegend status="pending" value={summary.pending} total={summary.guestRecords} />
              </div>
            </BandRow>
            {summary.unusablePhones.length > 0 && <BandRow><PhoneQualityDisclosure summary={summary} /></BandRow>}
            {summary.confirmed + summary.declined > 0 && (
              <BandRow className="bg-muted flex flex-col gap-2.5 py-3.5">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.07em] uppercase">מאיפה הגיעו התשובות</p>
                  <p className="text-foreground/80 text-[12.5px] tabular-nums">
                    {operatorAnswers(summary)} מתוך {summary.confirmed + summary.declined} תשובות הגיעו מנציגי Kululu בטלפון
                  </p>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead className="px-0">מקור</TableHead><TableHead className="w-24 text-end">אישרו</TableHead><TableHead className="w-24 px-0 text-end">לא מגיעים</TableHead></TableRow></TableHeader>
                  <TableBody>{summary.provenance.filter((row) => row.confirmed + row.declined > 0).map((row) => <TableRow key={row.label}><TableCell className="px-0 text-[13px]">{provenanceLabel(row.label)}</TableCell><TableCell className="text-end text-[13px] tabular-nums">{row.confirmed}</TableCell><TableCell className="px-0 text-end text-[13px] tabular-nums">{row.declined}</TableCell></TableRow>)}</TableBody>
                </Table>
              </BandRow>
            )}
          </>
        )}
      </Band>
    );
  } catch (error) {
    console.error('Event guest list failed:', error);
    return <BandFailure title="רשימת אורחים" />;
  }
}

function Metric({ value, label, supporting }: { value: number; label: string; supporting: string }) {
  return <div className="flex flex-col gap-0.5"><p className="text-xl font-semibold tracking-[-0.01em] tabular-nums">{value.toLocaleString('he-IL')} {label}</p><p className="text-muted-foreground text-[12.5px]">{supporting}</p></div>;
}

function RsvpBar({ summary }: { summary: EventGuestSummary }) {
  const total = summary.confirmed + summary.declined + summary.pending;
  if (!total) return null;
  return (
    <div className="bg-border flex h-2.5 overflow-hidden rounded-full" aria-label="התפלגות אישורי ההגעה">
      <div className="bg-rsvp-confirmed" style={{ width: `${summary.confirmed / total * 100}%` }} />
      <div className="bg-rsvp-declined" style={{ width: `${summary.declined / total * 100}%` }} />
      <div className="bg-rsvp-pending" style={{ width: `${summary.pending / total * 100}%` }} />
    </div>
  );
}

/*
 * Takes the status, not a colour and a label: those were two props carrying the
 * same fact, which a caller had to keep in sync by hand.
 */
function RsvpLegend({
  status,
  value,
  total,
}: {
  status: RsvpStatus;
  value: number;
  total: number;
}) {
  const percent = total ? Math.round(value / total * 100) : 0;
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          rsvpPresentation(status).solid,
        )}
      />
      <span className="text-sm font-semibold tabular-nums">{value.toLocaleString('he-IL')}</span>
      <span className="text-muted-foreground text-[13px]">{rsvpLabel(status)}</span>
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
    'Guest response': 'האורח ענה בעצמו בקישור',
    'Back Office call': 'נציג בטלפון',
    'Owner update': 'בעלי האירוע הזינו',
    'Before source tracking': 'לפני שהתחלנו לעקוב',
    'No response yet': 'עדיין אין תשובה',
  };
  return labels[label] ?? label;
}

export async function EventOutreachBand({ eventId }: { eventId: string }) {
  try {
    const [event, rows] = await Promise.all([getEventIdentity(eventId), getEventTimeline(eventId)]);
    if (!event) return <BandFailure title="ציר התקשורת" />;
    // The timeline shows either way, so an Operator can date the plan and shape
    // it before payment; call rounds wait for sending like everything else. An
    // empty guest list does not hide them: the audience is taken at Start.
    const sendingEnabled = event.canCreateSchedules;
    const guestSummary = sendingEnabled ? await getEventGuestSummary(eventId) : null;
    const messageSchedules = rows.filter((row) => row.kind === 'message');
    return (
      <Band
        id="outreach-timeline"
        title="ציר התקשורת"
        className="scroll-mt-20"
        // Bulk sending is gone (ADR 0013): a Schedule sends when its Due Time
        // comes. The manual paths left - the per-delivery resend on the
        // timeline and the late-guest send here - are capped at ten records.
        action={guestSummary ? (
          <div className="flex shrink-0 gap-2">
            {messageSchedules.some((row) => row.status === 'sent') && (
              <LateGuestsDialog
                schedules={messageSchedules.map(({ id, title, status, channel }) => ({ id, title, status, channel }))}
              />
            )}
            <AddCallRoundDialog events={[{ id: event.id, title: event.title, pending: guestSummary.pending, confirmed: guestSummary.confirmed }]} eventId={event.id} />
          </div>
        ) : null}
      >
        {!sendingEnabled && (
          <BandRow>
            <Item id="outreach-gate" variant="muted">
              <ItemContent>
                <ItemTitle>השליחה לא מופעלת לאירוע הזה</ItemTitle>
                <ItemDescription>שום דבר כאן לא יישלח עד שהתשלום יושלם ו-Kululu תפעיל את השליחה. עדיין אפשר לשנות תאריכים ואת ההזמנה</ItemDescription>
              </ItemContent>
            </Item>
          </BandRow>
        )}
        <BandRow>
          {rows.length ? (
            <EventTimeline rows={rows} eventId={event.id} sendingEnabled={sendingEnabled} />
          ) : (
            <Empty className="min-h-44 border-0 p-4"><EmptyHeader><EmptyTitle>לא מתוכננת תקשורת</EmptyTitle><EmptyDescription>{!sendingEnabled ? 'התוכנית נוצרת ברגע שלאירוע יש סוג ותאריך' : 'אפשר להוסיף סבב שיחות או לחכות שבעלי האירוע יגדירו הודעות'}</EmptyDescription></EmptyHeader></Empty>
          )}
        </BandRow>
      </Band>
    );
  } catch (error) {
    console.error('Event outreach failed:', error);
    return <BandFailure title="ציר התקשורת" />;
  }
}

/**
 * The Record Package (ADR 0027): what the Owner paid for, the bonus on top, how much of it
 * the guest list uses, and the payments behind it - the Plan and its upsales (ADR 0045).
 * Recording a payment is the only way Paid Records grow, and it is also how sending is
 * turned on.
 */
export async function EventRecordPackageBand({ eventId }: { eventId: string }) {
  try {
    const view = await getEventRecordPackage(eventId);
    if (!view) return <BandFailure title="חבילת רשומות" />;
    const pkg = view.package;
    return (
      <Band
        id="record-package"
        title="חבילת רשומות"
        className="scroll-mt-20"
        action={
          <div className="flex shrink-0 gap-2">
            <EventBillingStatusControl eventId={eventId} currentStatus={view.billingStatus} />
            <RecordPaymentDialog
              eventId={eventId}
              current={pkg}
              channel={view.channel}
              billingStatus={view.billingStatus}
              extraSchedules={view.extraSchedules}
            />
          </div>
        }
      >
        {!pkg ? (
          <BandRow>
            <p className="text-[13.5px] font-medium">לא נרשם תשלום</p>
            <p className="text-muted-foreground text-[12.5px] tabular-nums">
              ברשימת האורחים יש {view.used.toLocaleString('he-IL')} רשומות אורחים עם טלפון. כשהשליחה תופעל, אירוע בלי חבילה לא יגיע לאף אחד
            </p>
          </BandRow>
        ) : (
          <>
            <BandRow className="flex flex-wrap items-start gap-x-9 gap-y-4">
              <PackageFigure label="שולם" value={pkg.paid} supporting={view.channel ? RECORD_PACKAGE_CHANNEL_LABELS[view.channel] : null} />
              <PackageFigure
                label="בונוס"
                value={pkg.bonus}
                supporting={pkg.bonusIsCustom ? `מותאם, האוטומטי הוא ${view.automaticBonus}` : 'אוטומטי'}
                action={<BonusOverrideDialog eventId={eventId} bonus={pkg.bonus} isCustom={pkg.bonusIsCustom} automaticBonus={view.automaticBonus} />}
              />
              <PackageFigure label="חבילה" value={pkg.size} />
              <PackageFigure
                label="בשימוש"
                value={view.used}
                supporting={
                  view.uncounted > 0
                    ? `כולל רשומות שנמחקו אחרי שקיבלו הודעה · ${view.uncounted.toLocaleString('he-IL')} בלי טלפון לא נספרות`
                    : 'כולל רשומות שנמחקו אחרי שקיבלו הודעה'
                }
              />
              {view.over > 0 ? (
                <PackageFigure label="מחוץ לחבילה" value={view.over} tone="warning" supporting="מדולגות כשתזמון נשלח" />
              ) : (
                <PackageFigure label="נותרו" value={view.left} />
              )}
              {view.extraSchedules > 0 && (
                <PackageFigure label="תזמונים נוספים" value={view.extraSchedules} supporting="מעבר למה שכלול בתוכנית" />
              )}
            </BandRow>
            <BandRow className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-4">תאריך</TableHead>
                    <TableHead>מה נרכש</TableHead>
                    <TableHead className="text-end">כמות</TableHead>
                    <TableHead>תוכנית</TableHead>
                    <TableHead className="text-end">סכום</TableHead>
                    <TableHead>אמצעי תשלום</TableHead>
                    <TableHead>אסמכתה</TableHead>
                    <TableHead className="pe-4">נרשם על ידי</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="ps-4 tabular-nums">{formatShortDate(payment.occurredAt)}</TableCell>
                      <TableCell>{PAYMENT_KIND_LABELS[payment.kind]}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {payment.kind === 'extra_schedule'
                          ? countLabel(payment.schedules, 'תזמון אחד', 'תזמונים')
                          : `+${payment.records.toLocaleString('he-IL')} רשומות`}
                      </TableCell>
                      <TableCell>{payment.kind === 'extra_schedule' ? '-' : RECORD_PACKAGE_CHANNEL_LABELS[payment.channel]}</TableCell>
                      <TableCell className="text-end tabular-nums">₪{payment.amount.toLocaleString('he-IL')}</TableCell>
                      <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                      <TableCell className="max-w-48">
                        <span className="block truncate font-mono text-[12.5px]">{payment.reference ?? '-'}</span>
                        {payment.note && <span className="text-muted-foreground block truncate text-[12px]" title={payment.note}>{payment.note}</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground pe-4">{payment.recordedBy ?? 'לא ידוע'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </BandRow>
          </>
        )}
      </Band>
    );
  } catch (error) {
    console.error('Record package failed:', error);
    return <BandFailure title="חבילת רשומות" />;
  }
}

function PackageFigure({
  label,
  value,
  supporting,
  action,
  tone,
}: {
  label: string;
  value: number;
  supporting?: string | null;
  action?: React.ReactNode;
  tone?: 'warning';
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[11.5px]">{label}</span>
      <span className={cn('text-xl font-semibold tracking-[-0.01em] tabular-nums', tone === 'warning' && 'text-warning')}>
        {value.toLocaleString('he-IL')}
      </span>
      {supporting && <span className="text-muted-foreground text-[12px]">{supporting}</span>}
      {action}
    </div>
  );
}

export function EventDetailsBand({ event }: { event: EventIdentity }) {
  return (
    <Band title="פרטי האירוע">
      <BandRow className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="נוצר" value={formatEventDate(event.createdAt)} />
        <Detail label="חיוב" value={BILLING_STATUS_LABELS[event.billingStatus]} supporting={event.canCreateSchedules ? 'השליחה מופעלת' : 'השליחה כבויה'} />
        <Detail label="קוד עמוד האורחים" value={event.shortCode || 'לא הוקצה'} />
        <Detail label="שותפים" value={String(event.collaborators.length)} />
      </BandRow>
    </Band>
  );
}

export async function EventDetailsQueryBand({ eventId }: { eventId: string }) {
  try {
    const event = await getEventIdentity(eventId);
    return event ? <EventDetailsBand event={event} /> : <BandFailure title="פרטי האירוע" />;
  } catch (error) {
    console.error('Event details failed:', error);
    return <BandFailure title="פרטי האירוע" />;
  }
}

export function EventBandSkeleton() {
  return <div className="bg-card rounded-xl border p-4"><Skeleton className="mb-4 h-3 w-28" /><Skeleton className="h-24 w-full" /></div>;
}

export function BandFailure({ title }: { title: string }) {
  return <Band title={title}><BandRow className="flex items-center justify-between gap-4"><div><p className="text-[13.5px] font-medium">החלק הזה לא נטען</p><p className="text-muted-foreground text-[12px]">שאר פרטי האירוע עדיין זמינים</p></div><RetryButton /></BandRow></Band>;
}
