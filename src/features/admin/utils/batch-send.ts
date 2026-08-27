/**
 * The largest number of guests one batch may carry.
 *
 * Lives here rather than beside the Server Action that enforces it: a
 * `'use server'` module may only export async functions, and the dialog needs
 * the same number to cap its input.
 */
export const MAX_BATCH_SIZE = 500;
