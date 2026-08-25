'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { recordCallOutcome, saveCallNote } from '@/features/calls/actions/call-outcomes';
import {
  finishCallRound,
  reopenCallRound,
  deleteCallRound,
} from '@/features/calls/actions/call-rounds';
import { CALL_OUTCOMES, type CallOutcome } from '@/features/calls/types';
import type { RoundDetail, RoundGuestRow } from '@/features/admin/queries/call-round';
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

export function CallingSurface({ round }: { round: RoundDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const inProgress = round.completedAt === null;

  const called = round.guests.filter((guest) => guest.outcome !== null).length;
  const total = round.guests.length;

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return round.guests.filter((guest) => {
      if (filter !== 'All' && guest.outcome !== FILTER_OUTCOME[filter]) return false;
      if (!needle) return true;
      return (
        guest.name.toLowerCase().includes(needle) || (guest.phone ?? '').includes(needle)
      );
    });
  }, [round.guests, term, filter]);

  function setOutcome(guest: RoundGuestRow, outcome: CallOutcome) {
    // Clicking the active outcome clears it - a misclick during a call is
    // common and should not need a different control to undo.
    const next = guest.outcome === outcome ? null : outcome;

    startTransition(async () => {
      const result = await recordCallOutcome({
        roundId: round.id,
        guestId: guest.guestId,
        eventId: round.eventId,
        outcome: next,
      });
      if (result.success) router.refresh();
      else toast.error(result.message);
    });
  }

  function commitNote(guest: RoundGuestRow) {
    const draft = notes[guest.guestId];
    if (draft === undefined || draft === (guest.notes ?? '')) return;

    startTransition(async () => {
      const result = await saveCallNote({
        roundId: round.id,
        guestId: guest.guestId,
        eventId: round.eventId,
        notes: draft,
      });
      if (result.success) router.refresh();
      else toast.error(result.message);
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => roundAction(() => deleteCallRound(round.id), true)}
          >
            Delete round
          </Button>
          {inProgress ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => roundAction(() => finishCallRound(round.id))}
            >
              Finish round
            </Button>
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
              <th className="w-[110px] px-3 py-2 font-semibold">RSVP now</th>
              <th className="w-[280px] px-3 py-2 font-semibold">Call outcome</th>
              <th className="px-3 py-2 font-semibold">Note, host visible</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((guest) => (
              <tr key={guest.guestId} className="border-b last:border-b-0 align-middle">
                <td className="px-3 py-2">
                  <span className="block font-medium">{guest.name}</span>
                  <span className="text-muted-foreground block text-[12px] tabular-nums">
                    {guest.phone ?? 'No phone number'}
                  </span>
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
                  <div className="flex gap-1.5">
                    {CALL_OUTCOMES.map((outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        disabled={pending || !inProgress}
                        onClick={() => setOutcome(guest, outcome)}
                        className={cn(
                          'rounded-md border px-2 py-1 text-[12.5px] font-medium disabled:opacity-60',
                          guest.outcome === outcome
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-card hover:bg-accent',
                        )}
                      >
                        {OUTCOME_LABELS[outcome]}
                      </button>
                    ))}
                  </div>
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
                <td colSpan={4} className="text-muted-foreground px-3 py-8 text-center text-[13px]">
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
