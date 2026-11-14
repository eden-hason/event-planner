/**
 * The Marketing Cap Retry (CONTEXT.md, ADR 0056).
 *
 * `131049` (the per-user marketing cap) and `130472` (a marketing experiment
 * holdout) are WhatsApp withholding a marketing message from a number for now,
 * not the number being unreachable. On an Ask, the Delivery is tried again on
 * WhatsApp 6 and 24 hours after it was first withheld before any SMS Fallback.
 *
 * Derived from the Delivery's own attempts rather than stored: the rung is how
 * many marketing-cap failures it has had, and the clock runs from the first.
 * So the queueing pass, the SMS sweeper's hold and the Owner's "on its way" all
 * answer the same question from the same rows, and nothing can drift.
 *
 * Pure and dependency-free apart from the Send Window.
 */

import { isAsk } from './message-plan-kind';
import { nextOpenSlot, type SendWindow } from './send-window';

/** The two codes, as the queueing pass filters on them. */
export const MARKETING_CAP_CODES = [
  // Per-user marketing cap: Meta withheld it "to maintain healthy ecosystem engagement".
  131049,
  // The number is in a Meta marketing-message experiment holdout.
  130472,
] as const;

/** Hours after the first marketing-cap failure that each retry is due. */
export const MARKETING_CAP_RETRY_HOURS = [6, 24] as const;

/**
 * How long a due retry may go unsent - counted in open Send Window time -
 * before it is given up and the ordinary SMS Fallback takes over. A retry is
 * queued by the next sweep (five minutes) and sent within a minute, so only a
 * retry that cannot be rendered (the Guest Record gone or outside the Record
 * Package) or a pipeline that is down gets here. The Owner is then told the
 * truth - an SMS on the way - instead of "on its way" for a WhatsApp that
 * never comes.
 */
export const MARKETING_CAP_RETRY_GRACE_MINUTES = 60;

/**
 * How far back the queueing pass looks for a first failure. The 24-hour rung
 * moved to the next morning, plus the grace, lands well inside it.
 */
export const MARKETING_CAP_RETRY_LOOKBACK_HOURS = 48;

/**
 * A retry is due no later than this long before the Send Window closes, and
 * queued only while that much of the window is left. The window is checked
 * when the retry is queued, not when the Worker sends it, so the margin is what
 * keeps a retry queued at 20:55 from reaching a phone after 21:00.
 */
export const MARKETING_CAP_RETRY_CLOSING_MARGIN_MINUTES = 30;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export function isMarketingCapCode(errorCode: number | null | undefined): boolean {
  return errorCode != null && (MARKETING_CAP_CODES as readonly number[]).includes(errorCode);
}

/** The Send Window a retry is held to: the same, closing a margin earlier. */
export function marketingCapRetryWindow(sendWindow: SendWindow): SendWindow {
  const [hours, minutes] = sendWindow.end.split(':').map(Number);
  const end = hours * 60 + minutes - MARKETING_CAP_RETRY_CLOSING_MARGIN_MINUTES;
  const clock = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  return { start: sendWindow.start, end: clock };
}

export type MarketingCapAttempt = {
  channel: string;
  status: string;
  error_code: number | null;
  created_at: string;
};

export type MarketingCapRetryInput = {
  scheduleTypeKey: string | null | undefined;
  /** The Guest's answer now. Anything but pending is an answer. */
  rsvpStatus: string | null | undefined;
  /**
   * When the answer last changed. Only an answer given after the first
   * marketing-cap failure ends the retries: a Guest who had answered already
   * (the current plan's Invitation goes to everyone) is still owed the message.
   */
  rsvpChangedAt: string | null | undefined;
  /** The Event's date. No retry is due on or after it. */
  eventDate: string | null | undefined;
  attempts: readonly MarketingCapAttempt[];
  sendWindow: SendWindow;
  now: Date;
};

export type MarketingCapRetryState = {
  /** 1 for the 6-hour retry, 2 for the 24-hour one */
  rung: number;
  /** When the retry may be sent, already moved into the retry window */
  dueAt: Date;
  /** The retry has been claimed and is being sent right now */
  inFlight: boolean;
};

/**
 * The retries as the attempts alone describe them, whatever the Guest
 * answered: the last settled attempt is a marketing-cap failure on WhatsApp,
 * no SMS has been tried, and the Schedule is an Ask.
 */
function retryProgress(input: MarketingCapRetryInput) {
  if (!isAsk(input.scheduleTypeKey)) return null;

  const attempts = [...input.attempts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (attempts.length === 0) return null;
  if (attempts.some((attempt) => attempt.channel === 'sms')) return null;

  const latest = attempts[attempts.length - 1];
  const inFlight = latest.channel === 'whatsapp' && latest.status === 'pending';
  const settled = inFlight ? attempts.slice(0, -1) : attempts;
  const last = settled[settled.length - 1];
  if (!last || last.channel !== 'whatsapp' || last.status !== 'failed') return null;
  if (!isMarketingCapCode(last.error_code)) return null;

  const capFailures = settled.filter(
    (attempt) =>
      attempt.channel === 'whatsapp' &&
      attempt.status === 'failed' &&
      isMarketingCapCode(attempt.error_code),
  );
  return { inFlight, rung: capFailures.length, firstFailedAt: Date.parse(capFailures[0].created_at) };
}

/** Whether the Guest answered after WhatsApp first withheld this Ask. */
function answeredSince(input: MarketingCapRetryInput, firstFailedAt: number): boolean {
  if (input.rsvpStatus == null || input.rsvpStatus === 'pending') return false;
  if (!input.rsvpChangedAt) return false;
  return Date.parse(input.rsvpChangedAt) > firstFailedAt;
}

/**
 * Whether this Delivery is awaiting a Marketing Cap Retry, and when it is due.
 * Null means it is not: the SMS Fallback rules apply exactly as before - unless
 * `endedByAnswer` says the Guest answered instead.
 */
export function marketingCapRetry(input: MarketingCapRetryInput): MarketingCapRetryState | null {
  const progress = retryProgress(input);
  if (!progress) return null;
  if (answeredSince(input, progress.firstFailedAt)) return null;

  const hours = MARKETING_CAP_RETRY_HOURS[progress.rung - 1];
  if (hours === undefined) return null;

  const window = marketingCapRetryWindow(input.sendWindow);
  const dueAt = nextOpenSlot(new Date(progress.firstFailedAt + hours * HOUR_MS), window);

  // An Ask after the Event has nothing to ask.
  if (input.eventDate && dueAt.getTime() >= Date.parse(input.eventDate)) return null;

  // Due, never sent, and past the grace: given up, so the SMS can go.
  if (!progress.inFlight) {
    const graceEnds = nextOpenSlot(
      new Date(dueAt.getTime() + MARKETING_CAP_RETRY_GRACE_MINUTES * MINUTE_MS),
      window,
    );
    if (input.now.getTime() > graceEnds.getTime()) return null;
  }

  return { rung: progress.rung, dueAt, inFlight: progress.inFlight };
}

/**
 * An Ask WhatsApp withheld for its marketing limits, whose Guest has answered
 * since: nothing further is sent, not a retry and not an SMS. Asking someone
 * who just answered reads as a bug, and the answer is what the Ask was for.
 */
export function endedByAnswer(input: MarketingCapRetryInput): boolean {
  const progress = retryProgress(input);
  return progress !== null && answeredSince(input, progress.firstFailedAt);
}
