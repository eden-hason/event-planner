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

const MARKETING_CAP_CODES = new Set([
  // Per-user marketing cap: Meta withheld it "to maintain healthy ecosystem engagement".
  131049,
  // The number is in a Meta marketing-message experiment holdout.
  130472,
]);

/** Hours after the first marketing-cap failure that each retry is due. */
export const MARKETING_CAP_RETRY_HOURS = [6, 24] as const;

/**
 * A ladder nobody managed to run (a render that keeps failing, the cron down)
 * is given up this long after the first failure, so the Guest still gets their
 * SMS rather than waiting forever. The 24-hour rung pushed to the next morning
 * lands at most 36 hours on; this is comfortably past it.
 */
export const MARKETING_CAP_RETRY_MAX_HOURS = 48;

const HOUR_MS = 3_600_000;

export function isMarketingCapCode(errorCode: number | null | undefined): boolean {
  return errorCode != null && MARKETING_CAP_CODES.has(errorCode);
}

export type MarketingCapAttempt = {
  channel: string;
  status: string;
  error_code: number | null;
  created_at: string;
};

export type MarketingCapRetryInput = {
  scheduleTypeKey: string | null | undefined;
  /** The Guest's answer now. Anything but pending means they answered. */
  rsvpStatus: string | null | undefined;
  attempts: readonly MarketingCapAttempt[];
  sendWindow: SendWindow;
  now: Date;
};

export type MarketingCapRetryState = {
  /** 1 for the 6-hour retry, 2 for the 24-hour one */
  rung: number;
  /** When the retry may be sent, already moved into the Send Window */
  dueAt: Date;
  /** The retry has been claimed and is being sent right now */
  inFlight: boolean;
};

/**
 * The ladder as the attempts alone describe it, whatever the Guest answered:
 * the last settled attempt is a marketing-cap failure on WhatsApp, no SMS has
 * been tried, and the Schedule is an Ask.
 */
function ladder(input: MarketingCapRetryInput) {
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

function answered(input: MarketingCapRetryInput): boolean {
  return input.rsvpStatus != null && input.rsvpStatus !== 'pending';
}

/**
 * Whether this Delivery is awaiting a Marketing Cap Retry, and when it is due.
 * Null means it is not: the SMS Fallback rules apply exactly as before - unless
 * `endedByAnswer` says the Guest answered instead.
 */
export function marketingCapRetry(input: MarketingCapRetryInput): MarketingCapRetryState | null {
  if (answered(input)) return null;
  const state = ladder(input);
  if (!state) return null;

  const hours = MARKETING_CAP_RETRY_HOURS[state.rung - 1];
  if (hours === undefined) return null;
  if (input.now.getTime() - state.firstFailedAt > MARKETING_CAP_RETRY_MAX_HOURS * HOUR_MS) return null;

  return {
    rung: state.rung,
    dueAt: nextOpenSlot(new Date(state.firstFailedAt + hours * HOUR_MS), input.sendWindow),
    inFlight: state.inFlight,
  };
}

/**
 * An Ask WhatsApp withheld for its marketing limits, whose Guest has answered
 * since: nothing further is sent, not a retry and not an SMS. Asking someone
 * who already answered reads as a bug, and the answer is what the Ask was for.
 */
export function endedByAnswer(input: MarketingCapRetryInput): boolean {
  return answered(input) && ladder(input) !== null;
}
