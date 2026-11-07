import { sameConversation } from '@/features/confirmation/utils/answer-run';

/**
 * Which Guests changed their own RSVP, read from the answer snapshots the
 * Confirmation Conversation and the RSVP page leave in `guest_interactions`.
 *
 * Those snapshots are not a full history (CONTEXT.md, RSVP Source): only an
 * answer given through a Schedule leaves one, so an answer through the direct
 * invitation link or on a Call Round is invisible here, so the "changed their
 * answer" filter can miss someone (backlog 0036).
 *
 * A Guest is in the list when their RSVP is still their own - the source is
 * `guest`, so an Owner override or an Operator's call answer leaves them out -
 * and an earlier answer they gave differs from where it stands now: the other
 * status, or another count while coming.
 */

export type AnswerStatus = 'confirmed' | 'declined';

export type RsvpSnapshot = {
  guestId: string;
  status: AnswerStatus;
  /** The count, on a confirm; null on a decline or when the row never kept it. */
  amount: number | null;
  channel: string | null;
  at: string;
};

export type ChangedAnswerGuest = {
  id: string;
  name: string;
  phone: string | null;
  rsvpStatus: string | null;
  amount: number | null;
  rsvpChangeSource: string | null;
  rsvpChangedAt: string | null;
};

export type AnswerStep = {
  status: AnswerStatus;
  amount: number | null;
  /** Null only for a current answer that left no snapshot and no change time. */
  at: string | null;
};

/** declined: no longer coming. confirmed: coming after saying no. count: a new count. */
export type AnswerChangeKind = 'declined' | 'confirmed' | 'count';

export type ChangedAnswer = {
  guestId: string;
  name: string;
  phone: string | null;
  previous: AnswerStep;
  /** Timed by when the answer became what it is now. */
  current: AnswerStep;
  kind: AnswerChangeKind;
  /** Every answer that stood, oldest first, ending with the current one. */
  history: AnswerStep[];
};

// A confirm whose count was never kept cannot be told apart from another
// count, so it is not called a change.
const sameAnswer = (a: Omit<AnswerStep, 'at'>, b: Omit<AnswerStep, 'at'>) =>
  a.status === b.status &&
  (a.status === 'declined' || a.amount === null || b.amount === null || a.amount === b.amount);

const timeOf = (at: string | null) => (at ? Date.parse(at) : 0);

/**
 * The answers that stood, oldest first. An answer replaced within the same
 * conversation - the same channel, within the answer-run gap - never stood:
 * a Guest who taps "coming" and then "not coming" a minute later never told
 * anyone they were coming.
 */
export function settledAnswers(snapshots: RsvpSnapshot[]): AnswerStep[] {
  const ordered = [...snapshots].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return ordered
    .filter((snapshot, i) => {
      const next = ordered[i + 1];
      return !next || !sameConversation(snapshot, next);
    })
    .map(({ status, amount, at }) => ({ status, amount, at }));
}

export function findChangedAnswers(
  guests: ChangedAnswerGuest[],
  snapshots: RsvpSnapshot[],
): ChangedAnswer[] {
  const byGuest = new Map<string, RsvpSnapshot[]>();
  for (const snapshot of snapshots) {
    const list = byGuest.get(snapshot.guestId);
    if (list) list.push(snapshot);
    else byGuest.set(snapshot.guestId, [snapshot]);
  }

  const changed: ChangedAnswer[] = [];
  for (const guest of guests) {
    if (guest.rsvpChangeSource !== 'guest') continue;
    if (guest.rsvpStatus !== 'confirmed' && guest.rsvpStatus !== 'declined') continue;

    const steps = settledAnswers(byGuest.get(guest.id) ?? []);
    const now = {
      status: guest.rsvpStatus,
      amount: guest.rsvpStatus === 'confirmed' ? guest.amount : null,
    } as const;

    const previousIndex = steps.findLastIndex((step) => !sameAnswer(step, now));
    if (previousIndex === -1) continue;
    const previous = steps[previousIndex];

    // The current answer is the first step after the last different one. When
    // no snapshot holds it - it came through the direct link - it is the
    // record itself, timed by its last RSVP change.
    const currentStep = steps[previousIndex + 1];
    const current: AnswerStep = currentStep
      ? { ...now, at: currentStep.at }
      : { ...now, at: guest.rsvpChangedAt };

    changed.push({
      guestId: guest.id,
      name: guest.name,
      phone: guest.phone,
      previous,
      current,
      kind:
        now.status === 'declined'
          ? 'declined'
          : previous.status === 'declined'
            ? 'confirmed'
            : 'count',
      history: [
        ...steps
          .slice(0, previousIndex + 1)
          .filter((step, i, kept) => i === 0 || !sameAnswer(step, kept[i - 1])),
        current,
      ],
    });
  }

  return changed.sort((a, b) => timeOf(b.current.at) - timeOf(a.current.at));
}
