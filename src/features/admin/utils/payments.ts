import { israelToday, israelWallClockToIso } from '@/lib/date-time';

/** One recorded payment, reduced to what the Overview counts. */
export type PaymentRow = { eventId: string; amount: number; occurredAt: string };

export type PaymentTally = {
  paidEvents: number;
  paidEventsThisMonth: number;
  /** Shekels. */
  paymentsTotal: number;
  /** Shekels. */
  paymentsTotalThisMonth: number;
};

/** The first instant of the current calendar month in Israel, where the Operator reads it. */
export function israelMonthStart(now: Date = new Date()): string {
  return israelWallClockToIso(`${israelToday(now).slice(0, 7)}-01`, '00:00')!;
}

/**
 * Paid Events are the distinct Events behind the payments, so a top-up does not
 * count its Event twice, while its amount does add to the total. An Owner with
 * two paid Events counts twice. "This month" is by when the payment was made, not
 * when it was recorded.
 */
export function tallyPayments(rows: PaymentRow[], monthStart: string): PaymentTally {
  const start = Date.parse(monthStart);
  const thisMonth = rows.filter((row) => Date.parse(row.occurredAt) >= start);
  const total = (list: PaymentRow[]) => list.reduce((sum, row) => sum + row.amount, 0);

  return {
    paidEvents: new Set(rows.map((row) => row.eventId)).size,
    paidEventsThisMonth: new Set(thisMonth.map((row) => row.eventId)).size,
    paymentsTotal: total(rows),
    paymentsTotalThisMonth: total(thisMonth),
  };
}
