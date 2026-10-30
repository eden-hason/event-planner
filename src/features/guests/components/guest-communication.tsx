'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  IconBell,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconHeart,
  IconLink,
  IconMail,
  IconPhone,
  IconSend,
  IconUserCheck,
  type IconProps,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  GuestJourney,
  sendCatchUp,
  type CatchUpSendState,
} from '@/features/schedules';
import { useSaveEvent } from '@/features/auth';
import { loadGuestCommunication } from '@/features/guests/actions/communication';
import type {
  CommunicationRow,
  CommunicationState,
  GuestCommunication as Communication,
  RsvpSummary,
} from '@/features/guests/utils/guest-communication';
import { rsvpPresentation } from '@/features/guests/utils';
import { cn } from '@/lib/utils';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { daysUntil } from '@/features/schedules/utils/timeline';

const KNOWN_TYPES = [
  'initial_invitation',
  'confirmation',
  'event_reminder',
  'post_event',
  'phone_call',
] as const;

const TYPE_ICONS: Record<string, React.ComponentType<IconProps>> = {
  initial_invitation: IconMail,
  confirmation: IconUserCheck,
  event_reminder: IconBell,
  post_event: IconHeart,
  phone_call: IconPhone,
};

const TONE = {
  ok: 'bg-rsvp-confirmed-tint text-rsvp-confirmed-strong',
  pending: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  bad: 'bg-rsvp-declined-tint text-rsvp-declined-strong',
  missed:
    'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  neutral: 'bg-muted text-muted-foreground',
};

const STATE_TONE: Record<CommunicationState, keyof typeof TONE> = {
  seen: 'ok',
  reached: 'ok',
  on_its_way: 'pending',
  sms_on_its_way: 'pending',
  not_delivered: 'bad',
  no_phone: 'missed',
  outside_package: 'missed',
  added_after: 'missed',
  not_in_audience: 'neutral',
  will_get: 'pending',
  undated: 'neutral',
  locked: 'neutral',
  off: 'neutral',
  called: 'ok',
  call_queued: 'pending',
  call_planned: 'neutral',
};

type State = { guestId: string; data: Communication | null } | null;

/**
 * The guest drawer's Communication tab: every Outreach Item on the Event in
 * plan order, read for this guest - and, on the latest Invitation or Confirmation that went
 * out, the Catch-up Send when they missed it (ADR 0050). Loaded after the tab
 * opens, so it never holds the drawer up.
 */
export function GuestCommunication({
  guestId,
  guestName,
  invitationToken,
}: {
  guestId: string;
  guestName: string;
  invitationToken: string;
}) {
  const t = useTranslations('guests.list.communication');
  const [state, setState] = useState<State>(null);
  // Bumped after a send, to read the guest's new Delivery.
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadGuestCommunication(guestId)
      .then((data) => live && setState({ guestId, data }))
      .catch(() => live && setState({ guestId, data: null }));
    return () => {
      live = false;
    };
  }, [guestId, version]);

  const loading = state?.guestId !== guestId;
  const data = loading ? null : state.data;

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="flex flex-col gap-3.5" aria-busy>
          <Skeleton className="h-16 rounded-xl" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-2.5 w-[55%]" />
                <Skeleton className="h-2 w-[35%]" />
              </div>
            </div>
          ))}
        </div>
      ) : data === null ? (
        <div className="bg-muted text-muted-foreground rounded-xl p-3.5 text-center text-[13.5px]">
          {t('failed')}
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-bold tracking-[0.02em]">
              {t('rsvpTitle')}
            </h3>
            <RsvpCard rsvp={data.rsvp} />
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-bold tracking-[0.02em]">
              {t('planTitle')}
            </h3>
            {data.rows.length === 0 ? (
              <div className="bg-muted text-muted-foreground rounded-xl p-3.5 text-center text-[13.5px]">
                {t('empty')}
              </div>
            ) : (
              <ol className="flex flex-col divide-y rounded-xl border">
                {data.rows.map((row) => (
                  <li key={row.scheduleId}>
                    <OutreachRow
                      row={row}
                      guestId={guestId}
                      guestName={guestName}
                      expanded={open === row.scheduleId}
                      onToggle={() =>
                        setOpen((current) =>
                          current === row.scheduleId ? null : row.scheduleId,
                        )
                      }
                      onSent={() => setVersion((v) => v + 1)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
      <InvitationLink token={invitationToken} />
    </div>
  );
}

function useShortDate() {
  const locale = useLocale();
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    day: 'numeric',
    month: 'short',
  });
  return (iso: string) => format.format(new Date(iso));
}

function RsvpCard({ rsvp }: { rsvp: RsvpSummary }) {
  const t = useTranslations('guests.list.communication');
  const date = useShortDate();
  const status = rsvp.status as 'confirmed' | 'declined' | 'pending';
  const look = rsvpPresentation(status);

  const source = (() => {
    const s = rsvp.source;
    if (!s) return null;
    const at = date(s.at);
    switch (s.kind) {
      case 'chat':
      case 'page':
      case 'call':
        return t(`source.${s.kind}`, { date: at });
      case 'manual':
        if (s.byCurrentUser) return t('source.manualByYou', { date: at });
        return s.byName
          ? t('source.manual', { name: s.byName, date: at })
          : t('source.manualByOwner', { date: at });
    }
  })();

  return (
    <div className="flex items-center gap-3 rounded-xl border px-3.5 py-3">
      <span className={cn('size-2.5 shrink-0 rounded-full', look.solid)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-bold">
          {t(`rsvp.${status}`)}
          {rsvp.amount !== null && (
            <span className="text-muted-foreground font-semibold">
              {' · '}
              {t('rsvp.coming', { count: rsvp.amount })}
            </span>
          )}
        </span>
        {source && (
          <span className="text-muted-foreground text-xs">{source}</span>
        )}
      </div>
    </div>
  );
}

function OutreachRow({
  row,
  guestId,
  guestName,
  expanded,
  onToggle,
  onSent,
}: {
  row: CommunicationRow;
  guestId: string;
  guestName: string;
  expanded: boolean;
  onToggle: () => void;
  onSent: () => void;
}) {
  const t = useTranslations('guests.list.communication');
  const tTypes = useTranslations('schedules.actionTypes');
  const tTimeline = useTranslations('schedules.timeline');
  const locale = useLocale();
  const date = useShortDate();

  // What is ahead is counted down, what went out is dated - as on the
  // schedules list card. A Due Time already past but not sent reads as a date.
  const days = row.at ? daysUntil(row.at, new Date()) : null;
  const when = !row.at
    ? null
    : days === null
      ? date(row.at)
      : days === 0
        ? tTimeline('today')
        : days === 1
          ? tTimeline('tomorrow')
          : tTimeline('inDays', { count: days });

  const base = (KNOWN_TYPES as readonly string[]).includes(row.typeKey)
    ? tTypes(row.typeKey as (typeof KNOWN_TYPES)[number])
    : t('type.other');
  const label = row.number ? `${base} ${row.number.index}` : base;
  const Icon = TYPE_ICONS[row.typeKey] ?? IconSend;

  const status =
    row.state === 'called' && row.call?.outcome
      ? `${t('state.called')} · ${t(`callOutcome.${row.call.outcome}`)}`
      : t(`state.${row.state}`);
  const canExpand = row.journey !== null;

  const catchUp = row.catchUp;
  const toggle = canExpand ? onToggle : undefined;

  return (
    <div className="flex flex-col">
      <Item
        size="sm"
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        aria-expanded={canExpand ? expanded : undefined}
        onClick={toggle}
        onKeyDown={(event) => {
          if (!toggle || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          toggle();
        }}
        className={cn(
          'rounded-none px-3',
          canExpand && 'hover:bg-muted/50 cursor-pointer',
        )}
      >
        <ItemMedia className="bg-muted text-muted-foreground size-8 rounded-full">
          <Icon size={15} />
        </ItemMedia>
        <ItemContent className="min-w-0 gap-1">
          <ItemTitle className="text-[13.5px] font-semibold">{label}</ItemTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-bold',
                TONE[STATE_TONE[row.state]],
              )}
            >
              {status}
            </span>
            {row.at && when && (
              <span
                title={days === null ? undefined : date(row.at)}
                className="text-muted-foreground text-xs tabular-nums"
              >
                {when}
              </span>
            )}
          </div>
          {catchUp && !catchUp.available && (
            <ItemDescription className="text-xs">
              {t(`catchUp.reason.${catchUp.reason}`)}
            </ItemDescription>
          )}
        </ItemContent>
        {(catchUp?.available || canExpand) && (
          <ItemActions>
            {catchUp?.available && (
              // The confirm dialog is a React child of this, so its clicks
              // bubble here too: none of them may toggle the row.
              <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <CatchUpButton
                  guestId={guestId}
                  guestName={guestName}
                  scheduleLabel={label}
                  onSent={onSent}
                />
              </div>
            )}
            {canExpand && (
              <IconChevronDown
                size={16}
                className={cn(
                  'text-muted-foreground shrink-0 transition-transform',
                  expanded && 'rotate-180',
                )}
              />
            )}
          </ItemActions>
        )}
      </Item>

      {expanded && row.journey && (
        <div className="px-3 pt-1 pb-1">
          <GuestJourney
            row={row.journey}
            now={new Date()}
            locale={locale}
            bare
          />
        </div>
      )}
    </div>
  );
}

function CatchUpButton({
  guestId,
  guestName,
  scheduleLabel,
  onSent,
}: {
  guestId: string;
  guestName: string;
  scheduleLabel: string;
  onSent: () => void;
}) {
  const t = useTranslations('guests.list.communication.catchUp');
  const { requireSaved } = useSaveEvent();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const send = async () => {
    setConfirming(false);
    setPending(true);
    const promise = sendCatchUp(guestId).then((result: CatchUpSendState) => {
      if (!result.success) throw new Error(t(`error.${result.reason}`));
      return result;
    });
    toast.promise(promise, {
      loading: t('sending'),
      success: () => t('sent', { name: guestName }),
      error: (err) =>
        err instanceof Error ? err.message : t('error.send-failed'),
    });
    try {
      await promise;
    } catch {
      // The toast already said why.
    } finally {
      setPending(false);
      onSent();
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          // A Visitor's message reaches nobody until they save (ADR 0028).
          if (!requireSaved('send')) return;
          setConfirming(true);
        }}
      >
        <IconSend size={14} />
        {t('button')}
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('confirmTitle', { schedule: scheduleLabel, name: guestName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmBody', { name: guestName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={send}>{t('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * The guest's personal RSVP link, copied with its invitation line for the
 * Owner to share however they like. Copy rather than a send button: a second
 * "send" here, outside Kululu's own messages, reads as one more way Kululu
 * reaches the guest.
 */
function InvitationLink({ token }: { token: string }) {
  const t = useTranslations('guests');
  const { requireSaved } = useSaveEvent();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    // A Visitor's RSVP link reaches nobody until they save (ADR 0028).
    if (!requireSaved('share')) return;
    const link = `${window.location.origin}/c/${token}`;
    navigator.clipboard
      .writeText(`${t('sheet.copyInvitationLinkPrefix')}\n${link}`)
      .catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Item variant="outline" size="sm" className="rounded-xl">
      <ItemMedia variant="icon">
        <IconLink className="text-primary" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{t('list.drawer.link')}</ItemTitle>
        <ItemDescription>{t('list.drawer.linkDescription')}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? (
            <IconCheck className="text-success size-4" />
          ) : (
            <IconCopy className="size-4" />
          )}
          {copied ? t('list.drawer.copied') : t('list.drawer.copy')}
        </Button>
      </ItemActions>
    </Item>
  );
}
