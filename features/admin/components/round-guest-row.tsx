'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { recordCallOutcome } from '../actions/calls';
import type { CallLogWithGuest, CallOutcome } from '../types';

const OUTCOME_CONFIG: Record<
  CallOutcome,
  { label: string; buttonClass: string; badgeClass: string }
> = {
  no_answer: {
    label: 'No answer',
    buttonClass: 'hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300',
    badgeClass: 'bg-slate-100 text-slate-600',
  },
  confirmed: {
    label: 'Confirmed',
    buttonClass: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  declined: {
    label: 'Declined',
    buttonClass: 'hover:bg-red-50 hover:text-red-600 hover:border-red-300',
    badgeClass: 'bg-red-100 text-red-600',
  },
  call_back: {
    label: 'Call back',
    buttonClass: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  wrong_number: {
    label: 'Wrong #',
    buttonClass: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
};

const OUTCOMES: CallOutcome[] = ['no_answer', 'confirmed', 'declined', 'call_back', 'wrong_number'];

interface RoundGuestRowProps {
  log: CallLogWithGuest;
  eventId: string;
  onOutcomeChange: (logId: string, outcome: CallOutcome) => void;
}

export function RoundGuestRow({ log, eventId, onOutcomeChange }: RoundGuestRowProps) {
  const [outcome, setOutcome] = useState<CallOutcome | null>(log.outcome);
  const [pendingOutcome, setPendingOutcome] = useState<CallOutcome | null>(null);
  const [amount, setAmount] = useState<number>(log.amount);
  const [notes, setNotes] = useState<string>(log.notes ?? '');
  const [showNotes, setShowNotes] = useState(!!log.notes);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isResolved = outcome !== null;

  function save(selectedOutcome: CallOutcome, amt?: number) {
    startTransition(async () => {
      const promise = recordCallOutcome({
        logId: log.id,
        guestId: log.guestId,
        eventId,
        outcome: selectedOutcome,
        notes: notes.trim() || undefined,
        amount: selectedOutcome === 'confirmed' ? (amt ?? amount) : undefined,
      }).then((result) => {
        if (!result.success) throw new Error(result.message);
        return result;
      });

      toast.promise(promise, {
        loading: 'Saving…',
        success: () => {
          setOutcome(selectedOutcome);
          setPendingOutcome(null);
          setIsEditing(false);
          onOutcomeChange(log.id, selectedOutcome);
          return 'Outcome saved';
        },
        error: (err) => (err instanceof Error ? err.message : 'Failed to save'),
      });

      await promise.catch(() => {});
    });
  }

  function handleOutcomeClick(o: CallOutcome) {
    if (o === 'confirmed') {
      setPendingOutcome('confirmed');
    } else {
      save(o);
    }
  }

  function handleConfirmSave() {
    save('confirmed', amount);
  }

  const sideLabel = log.side === 'bride' ? 'Bride' : log.side === 'groom' ? 'Groom' : null;

  return (
    <tr
      className={cn(
        'group transition-colors hover:bg-muted/20',
        isResolved && !isEditing && 'opacity-50',
      )}
    >
      {/* Guest */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              isResolved && !isEditing && 'line-through text-muted-foreground',
            )}
          >
            {log.name}
          </span>
          {sideLabel && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {sideLabel}
            </span>
          )}
        </div>
        {log.groupName && (
          <p className="mt-0.5 text-xs text-muted-foreground">{log.groupName}</p>
        )}
      </td>

      {/* Phone */}
      <td className="px-4 py-3 align-middle w-32">
        {log.phone ? (
          <a
            href={`tel:${log.phone}`}
            className="text-xs text-blue-600 tabular-nums hover:underline transition-colors"
          >
            {log.phone}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Outcome */}
      <td className="px-4 py-3 align-middle">
        {isResolved && !isEditing ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                OUTCOME_CONFIG[outcome!].badgeClass,
              )}
            >
              {OUTCOME_CONFIG[outcome!].label}
              {outcome === 'confirmed' && amount > 1 && (
                <span className="ml-1 opacity-70">×{amount}</span>
              )}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
            >
              Edit
            </button>
          </div>
        ) : pendingOutcome !== 'confirmed' ? (
          <div className="flex flex-wrap gap-1">
            {OUTCOMES.map((o) => (
              <button
                key={o}
                disabled={isPending}
                onClick={() => handleOutcomeClick(o)}
                className={cn(
                  'rounded border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-all disabled:opacity-50',
                  OUTCOME_CONFIG[o].buttonClass,
                  outcome === o && 'bg-foreground/10 border-foreground/30 text-foreground',
                )}
              >
                {isPending ? (
                  <IconLoader2 className="h-3 w-3 animate-spin" />
                ) : (
                  OUTCOME_CONFIG[o].label
                )}
              </button>
            ))}
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setPendingOutcome(null);
                }}
                className="px-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Guests</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="w-14 rounded border px-2 py-1 text-xs bg-background"
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleConfirmSave} disabled={isPending}>
              {isPending && <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />}
              Save
            </Button>
            <button
              onClick={() => setPendingOutcome(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </td>

      {/* Notes */}
      <td className="px-4 py-3 align-middle w-44">
        {isResolved && !isEditing ? (
          <span className="text-xs text-muted-foreground italic">
            {notes || '—'}
          </span>
        ) : showNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            rows={2}
            className="w-full rounded border px-2 py-1 text-xs resize-none bg-background"
          />
        ) : (
          <button
            onClick={() => setShowNotes(true)}
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            + Add note
          </button>
        )}
      </td>
    </tr>
  );
}
