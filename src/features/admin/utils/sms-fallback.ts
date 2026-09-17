/**
 * The largest number of guests one SMS Fallback batch may carry.
 *
 * Lives here rather than beside the Server Action that enforces it: a
 * `'use server'` module may only export async functions, and the dialog needs
 * the same number to cap its input.
 *
 * This is the Fallback's own limit and not a general send limit. WhatsApp
 * sending is a queue drained by the Worker now, and the only other synchronous
 * path - an Operator's manual send - is capped at ten by MAX_MANUAL_RECIPIENTS
 * (ADR 0013).
 */
export const MAX_BATCH_SIZE = 500;
