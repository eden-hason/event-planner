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

/** Up to this many paid records the bonus is the small one (ADR 0024). */
const SMALL_PACK_MAX = 200;
const SMALL_PACK_BONUS = 10;
const BIG_PACK_BONUS = 20;

/** The automatic Bonus Records for a total of Paid Records: a flat step, never a percentage. */
export function bonusRecords(paidRecords: number): number {
  if (paidRecords <= 0) return 0;
  return paidRecords <= SMALL_PACK_MAX ? SMALL_PACK_BONUS : BIG_PACK_BONUS;
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
 * Which Guest Records a Schedule may send to. A Reached record is always inside; the room
 * left after every Reached record (including deleted ones) goes to the oldest unreached
 * records, in the order they were added. The rest are outside.
 */
export function splitByPackage(input: {
  packageSize: number;
  records: readonly { id: string; createdAt: string; reached: boolean }[];
  reachedDeletedCount: number;
}): PackageSplit {
  const reachedLive = input.records.filter((r) => r.reached).length;
  const room = Math.max(0, input.packageSize - reachedLive - input.reachedDeletedCount);

  const outside = input.records
    .filter((r) => !r.reached)
    .sort((a, b) =>
      a.createdAt === b.createdAt
        ? a.id.localeCompare(b.id)
        : a.createdAt < b.createdAt
          ? -1
          : 1,
    )
    .slice(room)
    .map((r) => r.id);

  const used = input.records.length + input.reachedDeletedCount;

  return {
    outside,
    used,
    left: Math.max(0, input.packageSize - used),
    over: Math.max(0, used - input.packageSize),
  };
}
