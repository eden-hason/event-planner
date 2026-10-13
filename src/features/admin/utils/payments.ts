import { israelToday, israelWallClockToIso } from '@/lib/date-time';

/** One recorded payment, reduced to what the Overview counts. */
export type PaymentRow = { ownerId: string; occurredAt: string };

export type PaymentTally = {
  paidUsers: number;
  paidUsersThisMonth: number;
  payments: number;
  paymentsThisMonth: number;
};

/** The first instant of the current calendar month in Israel, where the Operator reads it. */
export function israelMonthStart(now: Date = new Date()): string {
  return israelWallClockToIso(`${israelToday(now).slice(0, 7)}-01`, '00:00')!;
}

/**
 * Paid Users are the distinct Owners behind the payments, so a top-up does not
 * count its Owner twice. "This month" is by when the payment was made, not when
 * it was recorded.
 */
export function tallyPayments(rows: PaymentRow[], monthStart: string): PaymentTally {
  const start = Date.parse(monthStart);
  const thisMonth = rows.filter((row) => Date.parse(row.occurredAt) >= start);

  return {
    paidUsers: new Set(rows.map((row) => row.ownerId)).size,
    paidUsersThisMonth: new Set(thisMonth.map((row) => row.ownerId)).size,
    payments: rows.length,
    paymentsThisMonth: thisMonth.length,
  };
}
