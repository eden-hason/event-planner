export type AdminTopBarMode =
  | { kind: 'search' }
  | { kind: 'event'; eventId: string }
  | { kind: 'round'; eventId: string; roundId: string };

/**
 * Resolves every Back Office destination to an explicit top-bar state.
 * Parallel route slots retain their previous subpage on soft navigation when
 * the destination has no match, so falling through means search rather than
 * leaving a route unmatched.
 */
export function resolveAdminTopBar(segments: string[]): AdminTopBarMode {
  if (segments[0] !== 'events') return { kind: 'search' };

  if (segments.length === 2) {
    return { kind: 'event', eventId: segments[1] };
  }

  if (segments.length === 4 && segments[2] === 'rounds') {
    return {
      kind: 'round',
      eventId: segments[1],
      roundId: segments[3],
    };
  }

  return { kind: 'search' };
}
