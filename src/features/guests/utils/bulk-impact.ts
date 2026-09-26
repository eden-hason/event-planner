import type { GuestApp } from '@/features/guests/schemas';
import type { RsvpStatus } from './rsvp-presentation';

type ImpactGuest = Pick<
  GuestApp,
  'id' | 'rsvpStatus' | 'rsvpChangeSource' | 'tableId'
>;

export type RsvpImpact = {
  total: number;
  /** Records whose status actually moves. */
  changing: number;
  /** Guests who answered in their own words and are about to be overruled. */
  answeredThemselves: number;
  /** Declining ends a Table Assignment (ADR 0008). */
  losingSeat: number;
  needsConfirm: boolean;
};

/**
 * The fallout of setting an RSVP on a selection. The Owner outranks the Guest,
 * as they already do one record at a time, but never silently: anything that
 * overrides a Guest's own answer or costs a seat goes through a confirm.
 */
export function rsvpImpact(
  guests: readonly ImpactGuest[],
  target: RsvpStatus,
): RsvpImpact {
  const moving = guests.filter((guest) => guest.rsvpStatus !== target);
  const answeredThemselves = moving.filter(
    (guest) => guest.rsvpChangeSource === 'guest',
  ).length;
  const losingSeat =
    target === 'declined' ? moving.filter((guest) => guest.tableId).length : 0;
  return {
    total: guests.length,
    changing: moving.length,
    answeredThemselves,
    losingSeat,
    needsConfirm: answeredThemselves > 0 || losingSeat > 0,
  };
}

export type DeleteImpact = {
  total: number;
  /** Has at least one Delivery that reached the provider - history the delete takes with it. */
  messaged: number;
  answeredThemselves: number;
  /** Every Guest Record the Event has - the confirm takes its stronger form. */
  isWholeList: boolean;
};

export function deleteImpact(
  guests: readonly ImpactGuest[],
  messagedIds: ReadonlySet<string>,
  listTotal: number,
): DeleteImpact {
  return {
    total: guests.length,
    messaged: guests.filter((guest) => messagedIds.has(guest.id)).length,
    answeredThemselves: guests.filter(
      (guest) => guest.rsvpChangeSource === 'guest',
    ).length,
    isWholeList: guests.length > 0 && guests.length === listTotal,
  };
}
