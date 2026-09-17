/**
 * The largest number of guest records one manual Back Office send may carry.
 *
 * Must match MAX_MANUAL_RECIPIENTS in the sending configuration, which is what
 * actually enforces it. Duplicated here because the dialog has to disable its
 * own button and a `'use server'` module may only export async functions.
 *
 * Ten is not an arbitrary round number: this path sends synchronously, outside
 * the Worker's governor, so it is only safe while the overshoot it can cause
 * stays under Meta's throughput ceiling (ADR 0013).
 */
export const MAX_MANUAL_RECIPIENTS = 10;
