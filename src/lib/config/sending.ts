/**
 * Every knob the send pipeline turns, read and validated in one place.
 *
 * These are read from the environment rather than hardcoded so a bad night is
 * fixed from the Vercel dashboard instead of from a deploy - `WHATSAPP_MAX_MPS`
 * above all, which is the one number standing between Kululu and a breached
 * Throughput Budget on the largest send it has ever made.
 *
 * Read lazily, never at module scope: a build-time import must not fail because
 * a variable is missing, and a value changed in the dashboard should take
 * effect on the next invocation rather than the next deploy.
 */

function number(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`[config] ${name}="${raw}" is not a positive number - using ${fallback}`);
    return fallback;
  }
  return parsed;
}

function clock(name: string, fallback: string): string {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  if (!/^\d{2}:\d{2}$/.test(raw.trim())) {
    console.warn(`[config] ${name}="${raw}" is not HH:mm - using ${fallback}`);
    return fallback;
  }
  return raw.trim();
}

export type SendingConfig = {
  /** Messages per second the Worker releases. Meta's ceiling is 80. */
  whatsAppMaxPerSecond: number;
  /** Requests outstanding at once, so a slow Meta cannot pile up sockets. */
  whatsAppMaxInFlight: number;
  /** The Send Window, Israel wall clock. */
  sendWindow: { start: string; end: string };
  /**
   * How long a Schedule may be past its Due Time before it expires. Read
   * together with the Send Window, which can hold a Schedule overnight (~12
   * hours); 48 leaves room for a Dispatcher outage on top of that.
   */
  scheduleMaxLatenessHours: number;
  /** Quiet time on a Schedule's attempts before the SMS Fallback may run. */
  smsFallbackSettleMinutes: number;
  /** Guest-level failure rate, in percent, above which the Fallback Freeze holds. */
  smsFallbackFreezePct: number;
  /** Failures below which the Freeze never applies, so a test Event cannot freeze. */
  smsFallbackFreezeMin: number;
  /** How long a pending attempt may sit before the reaper calls it stranded. */
  attemptReaperMinutes: number;
  /** Hard cap on an Operator's manual send. */
  maxManualRecipients: number;
};

export function sendingConfig(): SendingConfig {
  return {
    whatsAppMaxPerSecond: number('WHATSAPP_MAX_MPS', 50),
    whatsAppMaxInFlight: number('WHATSAPP_MAX_IN_FLIGHT', 20),
    sendWindow: {
      start: clock('SEND_WINDOW_START', '09:00'),
      end: clock('SEND_WINDOW_END', '21:00'),
    },
    scheduleMaxLatenessHours: number('SCHEDULE_MAX_LATENESS_HOURS', 48),
    smsFallbackSettleMinutes: number('SMS_FALLBACK_SETTLE_MINUTES', 10),
    smsFallbackFreezePct: number('SMS_FALLBACK_FREEZE_PCT', 30),
    smsFallbackFreezeMin: number('SMS_FALLBACK_FREEZE_MIN', 10),
    attemptReaperMinutes: number('ATTEMPT_REAPER_MINUTES', 10),
    maxManualRecipients: number('MAX_MANUAL_RECIPIENTS', 10),
  };
}

/** Whether a cron or health request carries the shared secret. */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}
