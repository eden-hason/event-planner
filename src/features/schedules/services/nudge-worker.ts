/**
 * Asks the Worker to drain now rather than at the next minute boundary.
 *
 * Purely an impatience optimisation. The Worker is on its own cron, so a nudge
 * that fails costs at most sixty seconds and is never worth failing a send
 * over - which is why every error here is swallowed after a log line.
 *
 * It cannot simply call `drainQueue` in-process: the whole point of one Worker
 * is that one process holds the pace for every Event at once, and a send-now
 * that drained inline would be a second sender competing for the same
 * account-wide Throughput Budget (ADR 0013). The lease would stop it doing
 * damage, but going through the route keeps that a safety net rather than the
 * design.
 */
export async function nudgeWorker(): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) return;

  try {
    await fetch(`${base}/api/cron/send`, {
      headers: { authorization: `Bearer ${secret}` },
    });
  } catch (error) {
    console.error('[nudge] Could not reach the worker:', error);
  }
}
