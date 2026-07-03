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
    buttonClass: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300',
    badgeClass: 'bg-slate-100 text-slate-600',
  },
  confirmed: {
    label: 'Confirmed',
    buttonClass: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  declined: {
    label: 'Declined',
    buttonClass: 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 hover:text-red-600 hover:border-red-300',
    badgeClass: 'bg-red-100 text-red-600',
  },
};

const OUTCOMES: CallOutcome[] = ['no_answer', 'confirmed', 'declined'];

const CELL_TEXT = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' } as const;
const NAME_TEXT = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' } as const;

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return phone;
}

interface RoundGuestRowProps {
  log: CallLogWithGuest;
  eventId: string;
  fontSize?: 'sm' | 'md' | 'lg';
  onOutcomeChange: (logId: string, outcome: CallOutcome) => void;
}

export function RoundGuestRow({ log, eventId, fontSize = 'sm', onOutcomeChange }: RoundGuestRowProps) {
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

  const SIDE_LABELS: Record<string, string> = { bride: 'כלה', groom: 'חתן' };
  const sideLabel = log.side ? (SIDE_LABELS[log.side] ?? null) : null;

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
              NAME_TEXT[fontSize],
              'font-medium',
              isResolved && !isEditing && 'line-through text-muted-foreground',
            )}
          >
            {log.name}
          </span>
          {amount > 1 && (
            <span className={cn(CELL_TEXT[fontSize], 'text-muted-foreground tabular-nums')}>×{amount}</span>
          )}
        </div>
      </td>

      {/* Phone */}
      <td className="px-4 py-3 align-middle w-32 whitespace-nowrap">
        {log.phone ? (
          <a
            href={`tel:${log.phone}`}
            className={cn(CELL_TEXT[fontSize], 'text-blue-600 tabular-nums hover:underline transition-colors')}
          >
            {formatPhone(log.phone)}
          </a>
        ) : (
          <span className={cn(CELL_TEXT[fontSize], 'text-muted-foreground/40')}>—</span>
        )}
      </td>

      {/* Group */}
      <td className="px-4 py-3 align-middle w-28">
        {log.groupName ? (
          <span className={cn(CELL_TEXT[fontSize], 'inline-flex items-center rounded-full bg-muted px-2 py-0.5')}>
            {log.groupName}
          </span>
        ) : (
          <span className={cn(CELL_TEXT[fontSize], 'text-muted-foreground/40')}>—</span>
        )}
      </td>

      {/* Side */}
      <td className="px-4 py-3 align-middle w-20">
        {sideLabel ? (
          <span className={cn(CELL_TEXT[fontSize], 'inline-flex items-center rounded-full bg-muted px-2 py-0.5')}>
            {sideLabel}
          </span>
        ) : (
          <span className={cn(CELL_TEXT[fontSize], 'text-muted-foreground/40')}>—</span>
        )}
      </td>

      {/* Outcome */}
      <td className="px-4 py-3 align-middle">
        {isResolved && !isEditing ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 font-medium',
                CELL_TEXT[fontSize],
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
              className={cn(CELL_TEXT[fontSize], 'text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground')}
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
                  'rounded border px-2 py-1 font-medium transition-all disabled:opacity-50',
                  CELL_TEXT[fontSize],
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
                className={cn(CELL_TEXT[fontSize], 'px-1 text-muted-foreground hover:text-foreground')}
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className={cn(CELL_TEXT[fontSize], 'font-medium text-muted-foreground')}>Guests</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className={cn(CELL_TEXT[fontSize], 'w-14 rounded border px-2 py-1 bg-background')}
            />
            <Button size="sm" className={cn('h-7', CELL_TEXT[fontSize])} onClick={handleConfirmSave} disabled={isPending}>
              {isPending && <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />}
              Save
            </Button>
            <button
              onClick={() => setPendingOutcome(null)}
              className={cn(CELL_TEXT[fontSize], 'text-muted-foreground hover:text-foreground')}
            >
              Cancel
            </button>
          </div>
        )}
      </td>

      {/* Notes */}
      <td className="px-4 py-3 align-middle w-44">
        {isResolved && !isEditing ? (
          <span className={cn(CELL_TEXT[fontSize], 'text-muted-foreground italic')}>
            {notes || '—'}
          </span>
        ) : showNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            rows={2}
            className={cn(CELL_TEXT[fontSize], 'w-full rounded border px-2 py-1 resize-none bg-background')}
          />
        ) : (
          <button
            onClick={() => setShowNotes(true)}
            className={cn(CELL_TEXT[fontSize], 'text-muted-foreground/40 hover:text-muted-foreground transition-colors')}
          >
            + Add note
          </button>
        )}
      </td>
    </tr>
  );
}
