/**
 * Translating the database's refusals into something a planner can act on.
 *
 * Capacity is enforced in Postgres (ADR-0008), so the numbers that explain a
 * rejection - the party size, the places left, the shortfall - are only known
 * down there. The guards raise them in a parseable form and this turns them
 * back into structured data, so the interface can say "Nadav Rom brings 6
 * guests, Table 1 has 2 places left, 4 short" instead of "something went wrong".
 */

export type SeatingFailure =
  | {
      kind: 'overCapacity';
      party: number;
      free: number;
      shortfall: number;
      records: number;
    }
  | { kind: 'capacityBelowOccupancy'; occupancy: number; requested: number }
  | { kind: 'deleteOutOfScope' }
  | { kind: 'duplicateNumbers'; numbers: number[] }
  | { kind: 'tableNotFound' }
  | { kind: 'nothingAssignable' }
  | { kind: 'unknown' };

const readNumber = (message: string, key: string): number => {
  const match = new RegExp(`${key}=(-?\\d+)`).exec(message);
  return match ? Number(match[1]) : 0;
};

export function toSeatingFailure(error: unknown): SeatingFailure {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '');

  if (message.includes('seating_over_capacity')) {
    return {
      kind: 'overCapacity',
      party: readNumber(message, 'party'),
      free: readNumber(message, 'free'),
      shortfall: readNumber(message, 'shortfall'),
      records: readNumber(message, 'records') || 1,
    };
  }

  if (message.includes('seating_capacity_below_occupancy')) {
    return {
      kind: 'capacityBelowOccupancy',
      occupancy: readNumber(message, 'occupancy'),
      requested: readNumber(message, 'requested'),
    };
  }

  if (message.includes('seating_delete_out_of_scope')) {
    return { kind: 'deleteOutOfScope' };
  }

  if (message.includes('seating_table_not_found')) {
    return { kind: 'tableNotFound' };
  }

  if (message.includes('seating_no_assignable_records')) {
    return { kind: 'nothingAssignable' };
  }

  return { kind: 'unknown' };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  );
}
