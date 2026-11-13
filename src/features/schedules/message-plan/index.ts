/**
 * The current Message Plan's messages, in code (ADR 0053, 0054, 0055). Pure
 * and I/O-free: no database, no network, no configuration. Safe to import in
 * the browser, which the preview does.
 *
 * Meta's create payloads (./meta-templates) are not exported here: only the
 * submission script and their own test read them.
 */

export * from './shape';
export * from './message-parts';
export * from './fields';
export * from './personal-text';
export * from './render';
export * from './stages';
export type * from './types';
