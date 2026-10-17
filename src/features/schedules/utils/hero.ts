import type { OutreachItemStatus } from '../types';
import { ASK_TYPE_KEYS, hasNoAskPlanned } from './ask-plan';

/**
 * The hero at the top of the schedules page, as data.
 *
 * It answers two questions in order: is the plan on its way (the stepper and
 * the one Schedule that matters right now), and does anything need the Owner
 * (at most one attention line). Pure, so every state the design draws is a
 * test rather than a screenshot.
 */

/** One Schedule as the hero reads it. Callers pass them in plan order. */
export type HeroEntry = {
  id: string;
  label: string;
  status: OutreachItemStatus;
  scheduleTypeKey: string;
  scheduledDate: string | null;
  audienceCount: number | null;
  /** The Due Time with its clock face, already formatted. */
  when: string;
  callProgress: { total: number; awaiting: number } | null;
  /** When it went out (or its round finished), already formatted. */
  finishedOn: string | null;
  /** Targeted guests who will get the variant without a table number. */
  withoutTable: number;
};

/**
 * Three paints and no more. An in-flight call round is work that began, so it
 * reads as sent; expired and cancelled share the undated grey, since for the
 * guest the outcome is the same - nothing arrives.
 */
export type HeroSegment = 'sent' | 'scheduled' | 'off';

export type HeroFocus =
  | {
      kind: 'live';
      label: string;
      handled: number;
      total: number;
    }
  | {
      kind: 'next';
      label: string;
      audienceCount: number | null;
      when: string;
      /**
       * Something is still undated, so the next *dated* send is not
       * necessarily the next send - the label says which it is.
       */
      datedOnly: boolean;
    }
  | {
      kind: 'done';
      scheduleId: string;
      label: string;
      finishedOn: string | null;
    };

export type HeroAttention =
  | { kind: 'noAsk'; scheduleId: string }
  | { kind: 'tables'; label: string; count: number };

/** A locked plan has nothing to report but its size. */
export type HeroModel =
  | { locked: true; total: number }
  | {
      locked: false;
      total: number;
      counts: {
        sent: number;
        scheduled: number;
        undated: number;
        skipped: number;
      };
      segments: HeroSegment[];
      focus: HeroFocus | null;
      attention: HeroAttention | null;
    };

const SENT: readonly OutreachItemStatus[] = [
  'sent',
  'completed',
  'in_progress',
];
const SKIPPED: readonly OutreachItemStatus[] = ['expired', 'cancelled'];

function segmentOf(status: OutreachItemStatus): HeroSegment {
  if (SENT.includes(status)) return 'sent';
  if (status === 'pending') return 'scheduled';
  return 'off';
}

export function heroModel(entries: readonly HeroEntry[]): HeroModel {
  const total = entries.length;

  // "The plan is locked" is a property of the Event: its Schedules were seeded
  // disabled together and are released together, so one locked row means all.
  if (entries.some((entry) => entry.status === 'locked')) {
    return { locked: true, total };
  }

  const count = (match: (status: OutreachItemStatus) => boolean) =>
    entries.filter((entry) => match(entry.status)).length;
  const counts = {
    sent: count((status) => SENT.includes(status)),
    scheduled: count((status) => status === 'pending'),
    undated: count((status) => status === 'undated'),
    skipped: count((status) => SKIPPED.includes(status)),
  };

  const next = entries.find((entry) => entry.status === 'pending') ?? null;
  const live = entries.find(
    (entry) => entry.status === 'in_progress' && entry.callProgress,
  );

  let focus: HeroFocus | null = null;
  if (live?.callProgress) {
    // A round being worked is the most current thing on the page; the next
    // send comes back once it completes.
    const { total: roundTotal, awaiting } = live.callProgress;
    focus = {
      kind: 'live',
      label: live.label,
      handled: roundTotal - awaiting,
      total: roundTotal,
    };
  } else if (next) {
    focus = {
      kind: 'next',
      label: next.label,
      audienceCount: next.audienceCount,
      when: next.when,
      datedOnly: counts.undated > 0,
    };
  } else if (counts.undated === 0) {
    const last = entries.findLast((entry) => SENT.includes(entry.status));
    if (last) {
      focus = {
        kind: 'done',
        scheduleId: last.id,
        label: last.label,
        finishedOn: last.finishedOn,
      };
    }
  }

  return {
    locked: false,
    total,
    counts,
    segments: entries.map((entry) => segmentOf(entry.status)),
    focus,
    attention: attentionFor(entries, next),
  };
}

/**
 * The one thing that needs the Owner, most urgent first. The order is the
 * severity; the treatment is the same quiet warning for all of them.
 */
function attentionFor(
  entries: readonly HeroEntry[],
  next: HeroEntry | null,
): HeroAttention | null {
  // Nothing asks the guests anything until an ask is dated (ADR 0029). Points
  // at the first ask in plan order, where the date field is.
  if (hasNoAskPlanned(entries)) {
    const ask = entries.find(
      (entry) =>
        entry.status === 'undated' &&
        ASK_TYPE_KEYS.includes(entry.scheduleTypeKey),
    );
    if (ask) return { kind: 'noAsk', scheduleId: ask.id };
  }

  // Only once the table message is the next send: weeks out nearly everyone is
  // without a table, and saying so all along would be noise.
  if (next && next.withoutTable > 0) {
    return {
      kind: 'tables',
      label: next.label,
      count: next.withoutTable,
    };
  }

  return null;
}
