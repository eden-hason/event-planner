/**
 * The Record Package (ADR 0027): how many Guest Records an Event may reach, and which of
 * its records those are. Pure and I/O-free so the homepage simulator, the Back Office, the
 * Owner's surfaces and the sending gate all count the same way.
 */

import type {
  PackageSplit,
  PackageState,
  RecordPackage,
  RecordPackageChannel,
} from '../types';

/** The channels a package is sold on, with the homepage's per-record rate in shekels. */
export const RECORD_PACKAGE_CHANNELS = [
  'sms',
  'whatsapp',
  'whatsapp_calls',
] as const satisfies readonly RecordPackageChannel[];

export const RECORD_PACKAGE_RATES: Record<RecordPackageChannel, number> = {
  sms: 1,
  whatsapp: 1.5,
  whatsapp_calls: 2,
};

/** From this many paid records a package earns its bonus (ADR 0030). */
export const BONUS_MIN_PAID = 150;
/** The bonus is the same whatever the package size: a flat gift, never a percentage. */
export const BONUS_RECORDS = 10;

/** The automatic Bonus Records for a total of Paid Records. */
export function bonusRecords(paidRecords: number): number {
  return paidRecords >= BONUS_MIN_PAID ? BONUS_RECORDS : 0;
}

/**
 * Paid Records are the sum of the recorded payments. The bonus is worked out from that
 * total, so splitting a purchase never stacks bonuses, unless an Operator overrode it.
 * Null when nothing was ever paid for: the Event has no package, not a package of zero.
 */
export function recordPackage(input: {
  payments: readonly number[];
  bonusOverride: number | null;
}): RecordPackage | null {
  if (input.payments.length === 0) return null;

  const paid = input.payments.reduce((sum, records) => sum + records, 0);
  const bonusIsCustom = input.bonusOverride !== null;
  const bonus = bonusIsCustom ? input.bonusOverride! : bonusRecords(paid);

  return { paid, bonus, bonusIsCustom, size: paid + bonus };
}

/** Share of the package that counts as "nearly full" (brief: 90% or more). */
const NEAR_FULL = 0.9;

/** Where the guest list sits against the package, for the tone of the package line. */
export function packageState(size: number, used: number): PackageState {
  if (used > size) return 'over';
  if (used === size) return 'full';
  return used >= size * NEAR_FULL ? 'near' : 'room';
}

/**
 * The short status beside a package's count line: how far over, full, or how many left.
 * `warn` once the package is nearly full, so the line turns before it is too late.
 */
export function packageAside(view: {
  state: PackageState;
  left: number;
  over: number;
}): { key: 'over' | 'full' | 'left'; count: number; warn: boolean } {
  const warn = view.state === 'over' || view.state === 'near';
  if (view.state === 'over') return { key: 'over', count: view.over, warn };
  if (view.state === 'full') return { key: 'full', count: 0, warn };
  return { key: 'left', count: view.left, warn };
}

/**
 * Which Guest Records a Schedule may send to (ADR 0027, ADR 0033). Only records that could
 * ever be sent to count: a Reached record, or one with a phone number. A Reached record is
 * always inside; the room left after every Reached record (including deleted ones) goes to
 * the unreached records with a phone, in the order they got it. The rest are outside.
 *
 * A record with no phone is neither counted nor outside - nothing can be sent to it - and
 * is reported as `uncounted`, so the Owner can see why the count is lower than the list.
 */
export function splitByPackage(input: {
  packageSize: number;
  records: readonly {
    id: string;
    /** When it last went from no phone to a phone; null while it has none. */
    phoneAddedAt: string | null;
    reached: boolean;
  }[];
  reachedDeletedCount: number;
}): PackageSplit {
  const reachedLive = input.records.filter((r) => r.reached).length;
  const room = Math.max(0, input.packageSize - reachedLive - input.reachedDeletedCount);

  const waiting = input.records.filter(
    (r): r is typeof r & { phoneAddedAt: string } => !r.reached && r.phoneAddedAt !== null,
  );

  const outside = waiting
    .sort((a, b) =>
      a.phoneAddedAt === b.phoneAddedAt
        ? a.id.localeCompare(b.id)
        : a.phoneAddedAt < b.phoneAddedAt
          ? -1
          : 1,
    )
    .slice(room)
    .map((r) => r.id);

  const used = reachedLive + waiting.length + input.reachedDeletedCount;

  return {
    outside,
    used,
    uncounted: input.records.length - reachedLive - waiting.length,
    left: Math.max(0, input.packageSize - used),
    over: Math.max(0, used - input.packageSize),
  };
}
