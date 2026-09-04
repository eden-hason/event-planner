'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Info, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { recordCallOutcome, saveCallNote } from '@/features/calls/actions/call-outcomes';
import {
  finishCallRound,
  reopenCallRound,
  deleteCallRound,
} from '@/features/calls/actions/call-rounds';
import { CALL_OUTCOMES, type CallOutcome } from '@/features/calls/types';
import type { RoundDetail, RoundGuestRow } from '@/features/admin/queries/call-round';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: 'No answer',
  confirmed: 'Confirmed',
  declined: 'Declined',
};

const FILTERS = ['All', 'Not called', 'No answer', 'Confirmed', 'Declined'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_OUTCOME: Record<Exclude<Filter, 'All'>, CallOutcome | null> = {
  'Not called': null,
  'No answer': 'no_answer',
  Confirmed: 'confirmed',
  Declined: 'declined',
};

/**
 * RSVP is a category, not a severity: amber pending / emerald confirmed / red
 * declined is the vocabulary the Owner app already speaks. It is the only
 * colour on this page that is not lateness or failure.
 */
const RSVP_STYLES: Record<RoundGuestRow['currentRsvpStatus'], string> = {
  pending: 'border-amber-300 text-amber-700',
  confirmed: 'border-emerald-300 text-emerald-700',
  declined: 'border-red-300 text-red-700',
};

/**
 * The outcome buttons borrow the same vocabulary, so a scan down the column
 * reads as results rather than three identical chips: a tint while the button
 * is an option, the solid fill once it is the recorded outcome. No answer
 * stays neutral - it is the absence of a result, not one of them.
 */
const OUTCOME_STYLES: Record<CallOutcome, { idle: string; active: string }> = {
  no_answer: {
    idle: 'bg-card hover:bg-accent',
    active: 'border-primary bg-primary text-primary-foreground',
  },
  confirmed: {
    idle: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    active: 'border-emerald-600 bg-emerald-600 text-white',
  },
  declined: {
    idle: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    active: 'border-red-600 bg-red-600 text-white',
  },
};

function Tally({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: number;
  /** Secondary line - e.g. the headcount behind a count of guest records */
  hint?: string;
  className: string;
}) {
  return (
    <div className="bg-muted/50 flex min-w-[104px] flex-1 flex-col gap-0.5 rounded-lg px-3 py-2">
      <span className={cn('text-[11.5px] font-medium', className)}>{label}</span>
      <span className="text-foreground text-lg font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-muted-foreground text-[11px] tabular-nums">{hint}</span>}
    </div>
  );
}

/**
 * The outcome buttons plus, for Confirmed, a headcount popover.
 *
 * Confirmed does not commit on the first click: a record covers a whole family,
 * and the caller has just been told how many are actually coming. Clicking
 * Confirmed opens a popover seeded with the record's current number; nothing is
 * written until the operator presses the confirm button in it, so the real
 * party size lands in a single write. No answer and Declined still commit
 * immediately - they carry no headcount.
 */
function OutcomeCell({
  guest,
  inProgress,
  onRecord,
}: {
  guest: RoundGuestRow;
  inProgress: boolean;
  onRecord: (outcome: CallOutcome | null, amount?: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(guest.amount);

  const confirmed = guest.outcome === 'confirmed';
  // No `pending` gate: writes are optimistic and run in the background, so the
  // operator can keep working down the list without waiting for each one.
  const disabled = !inProgress;

  function clickOtherOutcome(outcome: CallOutcome) {
    // Clicking the active outcome clears it - a misclick during a call is
    // common and should not need a different control to undo.
    onRecord(guest.outcome === outcome ? null : outcome);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CALL_OUTCOMES.map((outcome) => {
        if (outcome === 'confirmed') {
          return (
            <Popover
              key={outcome}
              open={open}
              onOpenChange={(next) => {
                if (next) setDraft(guest.amount); // reseed from the record each open
                setOpen(next);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[12.5px] font-medium disabled:opacity-60',
                    confirmed || open
                      ? OUTCOME_STYLES.confirmed.active
                      : OUTCOME_STYLES.confirmed.idle,
                  )}
                >
                  {OUTCOME_LABELS.confirmed}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-3">
                <div className="flex flex-col gap-2.5">
                  <span className="text-[12px] font-medium">How many guests are coming?</span>
                  <div className="flex items-center gap-2">
                    <div className="border-input flex items-center rounded-md border">
                      <button
                        type="button"
                        disabled={draft <= 1}
                        onClick={() => setDraft((n) => Math.max(1, n - 1))}
                        className="px-2 py-1.5 disabled:opacity-40"
                        aria-label="One fewer guest"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-9 text-center text-[13px] font-semibold tabular-nums">
                        {draft}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraft((n) => n + 1)}
                        className="px-2 py-1.5"
                        aria-label="One more guest"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={disabled}
                      onClick={() => {
                        onRecord('confirmed', Math.max(1, draft));
                        setOpen(false);
                      }}
                    >
                      {confirmed ? 'Update' : 'Confirm'}
                    </Button>
                  </div>
                  {confirmed && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onRecord(null);
                        setOpen(false);
                      }}
                      className="text-muted-foreground hover:text-foreground text-left text-[12px] disabled:opacity-60"
                    >
                      Clear this outcome
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        }

        return (
          <button
            key={outcome}
            type="button"
            disabled={disabled}
            onClick={() => clickOtherOutcome(outcome)}
            className={cn(
              'rounded-md border px-2 py-1 text-[12.5px] font-medium disabled:opacity-60',
              guest.outcome === outcome
                ? OUTCOME_STYLES[outcome].active
                : OUTCOME_STYLES[outcome].idle,
            )}
          >
            {OUTCOME_LABELS[outcome]}
          </button>
        );
      })}
    </div>
  );
}

export function CallingSurface({ round }: { round: RoundDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Saving a note runs on its own transition so it never disables the outcome
  // buttons. Otherwise clicking a status right after typing a note blurs the
  // input, that blur starts a transition, the button disables mid-click, and
  // the status change is swallowed - the operator has to click it twice.
  const [, startNoteTransition] = useTransition();
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const inProgress = round.completedAt === null;

  // Optimistic overlay on the server-fetched rows. Each mutation patches the
  // matching guest immediately; the Server Action then runs in the background
  // and its `revalidatePath` re-renders this route with the real state, which
  // reconciles the overlay away. A failed action never revalidates, so the
  // overlay falls back to the unchanged server row - the edit visibly rolls
  // back - and we surface the error as a toast. No `router.refresh()`.
  const [guests, patchGuest] = useOptimistic(
    round.guests,
    (rows: RoundGuestRow[], patch: { guestId: string; changes: Partial<RoundGuestRow> }) =>
      rows.map((row) =>
        row.guestId === patch.guestId ? { ...row, ...patch.changes } : row,
      ),
  );

  const called = guests.filter((guest) => guest.outcome !== null).length;
  const total = guests.length;
  const tally = guests.reduce(
    (counts, guest) => {
      if (guest.outcome) counts[guest.outcome] += 1;
      if (guest.outcome === 'confirmed') counts.confirmedGuests += guest.amount;
      return counts;
    },
    { confirmed: 0, declined: 0, no_answer: 0, confirmedGuests: 0 },
  );

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return guests.filter((guest) => {
      if (filter !== 'All' && guest.outcome !== FILTER_OUTCOME[filter]) return false;
      if (!needle) return true;
      return (
        guest.name.toLowerCase().includes(needle) || (guest.phone ?? '').includes(needle)
      );
    });
  }, [guests, term, filter]);

  function recordOutcome(guest: RoundGuestRow, outcome: CallOutcome | null, amount?: number) {
    startTransition(async () => {
      // Mirror what the action writes: confirm/decline also move the RSVP, and
      // a confirm with a headcount updates the record's amount. Clearing an
      // outcome deliberately leaves the RSVP where it was.
      const changes: Partial<RoundGuestRow> = { outcome };
      if (outcome === 'confirmed') {
        changes.currentRsvpStatus = 'confirmed';
        if (amount !== undefined) changes.amount = Math.max(1, amount);
      } else if (outcome === 'declined') {
        changes.currentRsvpStatus = 'declined';
      }
      patchGuest({ guestId: guest.guestId, changes });

      const result = await recordCallOutcome({
        roundId: round.id,
        guestId: guest.guestId,
        eventId: round.eventId,
        outcome,
        amount,
      });
      if (!result.success) toast.error(result.message);
    });
  }

  function commitNote(guest: RoundGuestRow) {
    const draft = notes[guest.guestId];
    if (draft === undefined || draft === (guest.notes ?? '')) return;

    startNoteTransition(async () => {
      patchGuest({ guestId: guest.guestId, changes: { notes: draft.trim() || null } });

      const result = await saveCallNote({
        roundId: round.id,
        guestId: guest.guestId,
        eventId: round.eventId,
        notes: draft,
      });
      if (!result.success) toast.error(result.message);
    });
  }

  function roundAction(fn: () => Promise<{ success: boolean; message: string }>, back = false) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (back) router.push(`/admin/events/${round.eventId}`);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight">{round.title}</h1>
            <span
              className={cn(
                'rounded-full border px-2 py-px text-[11px] font-semibold tracking-[0.04em] uppercase',
                inProgress ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {inProgress ? 'In progress' : 'Completed'}
            </span>
          </div>
          <p className="text-muted-foreground text-[13px]">
            Snapshot of {total} {round.targetStatus ?? ''} guest {total === 1 ? 'record' : 'records'},
            taken{' '}
            {new Date(round.startedAt).toLocaleString('en-GB', {
              timeZone: 'Asia/Jerusalem',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {inProgress ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => roundAction(() => deleteCallRound(round.id), true)}
              >
                Delete round
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => roundAction(() => finishCallRound(round.id))}
              >
                Finish round
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => roundAction(() => reopenCallRound(round.id))}
            >
              Reopen round
            </Button>
          )}
        </div>
      </div>

      {/* Progress without pressure: 40 of 120 is a fact, not a shortfall. */}
      <p className="text-muted-foreground text-[13px]">
        <span className="text-foreground font-semibold tabular-nums">{called}</span> of{' '}
        <span className="tabular-nums">{total}</span> called
      </p>

      {/*
       * What the round produced, in the Owner app's own three categories, so a
       * finished round reads as results rather than a frozen worklist. Held
       * back until the first outcome lands - three zeros say nothing.
       */}
      {called > 0 && (
        <div className="flex flex-wrap gap-2">
          <Tally
            label="Confirmed"
            value={tally.confirmed}
            hint={`${tally.confirmedGuests} ${tally.confirmedGuests === 1 ? 'guest' : 'guests'}`}
            className="text-emerald-700"
          />
          <Tally label="Declined" value={tally.declined} className="text-red-700" />
          <Tally label="No answer" value={tally.no_answer} className="text-amber-700" />
          <Tally label="Not called" value={total - called} className="text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="border-input bg-card flex w-full max-w-[280px] items-center gap-2 rounded-md border px-2.5 py-1.5">
          <Search className="text-muted-foreground size-[15px] shrink-0" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search this round"
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          />
        </div>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-[12.5px] font-medium',
              filter === option ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-[11.5px] font-semibold tracking-[0.06em] uppercase">
              <th className="px-3 py-2 font-semibold">Guest record</th>
              <th className="w-[150px] px-3 py-2 font-semibold">Phone</th>
              <th className="w-[110px] px-3 py-2 font-semibold">RSVP now</th>
              <th className="w-[280px] px-3 py-2 font-semibold">Call outcome</th>
              <th className="px-3 py-2 font-semibold">Note, host visible</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((guest) => (
              <tr key={guest.guestId} className="border-b last:border-b-0 align-middle">
                <td className="px-3 py-2">
                  <span className="font-medium">{guest.name}</span>{' '}
                  <span
                    dir="ltr"
                    className="text-muted-foreground inline-block text-[12px] tabular-nums"
                  >
                    (x{guest.amount})
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[12.5px] tabular-nums">
                  {guest.phone ? (
                    formatPhone(guest.phone)
                  ) : (
                    <span className="text-muted-foreground font-sans">No phone number</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-px text-[11.5px] font-medium capitalize',
                      RSVP_STYLES[guest.currentRsvpStatus],
                    )}
                  >
                    {guest.currentRsvpStatus}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <OutcomeCell
                    guest={guest}
                    inProgress={inProgress}
                    onRecord={(outcome, amount) => recordOutcome(guest, outcome, amount)}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    defaultValue={guest.notes ?? ''}
                    disabled={!inProgress}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [guest.guestId]: event.target.value }))
                    }
                    onBlur={() => commitNote(guest)}
                    placeholder="What the couple should know"
                    className="h-8 text-[13px]"
                  />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-8 text-center text-[13px]">
                  No records match this filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground flex items-start gap-2 text-[12.5px]">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          Notes are visible to the couple in their app. RSVP now is what the guest record says
          today, the outcome is what happened on the call
        </span>
      </p>
    </div>
  );
}
