/**
 * TypeScript-only view models for the Digital Gifting page. No Zod here - the
 * wire/validation schemas live in `schemas/`.
 */

/** A single provider's connection config, as held in the app-level event settings. */
export type GiftProviderConfig = {
  enabled: boolean;
  link: string;
};

/** Badge state shown next to a provider card. */
export type GiftProviderStatus = 'off' | 'connected' | 'incomplete' | 'error';

/** The Bit card is a small state machine driven by the QR upload. */
export type BitDecodePhase =
  | 'idle'
  | 'decoding'
  | 'resolved'
  | 'connected'
  | 'error';

/**
 * Every way reading a Bit link out of an uploaded image can fail. The design's
 * `expired` / `resolvefail` / `network` kinds need a server-side Bit link
 * resolver that does not exist yet, so they are not represented - decoding is
 * entirely local.
 */
export type BitDecodeErrorKind =
  | 'unsupported'
  | 'oversized'
  | 'noqr'
  | 'notbit'
  | 'generic';

export type BitDecodeResult =
  | { ok: true; link: string }
  | { ok: false; kind: BitDecodeErrorKind };
