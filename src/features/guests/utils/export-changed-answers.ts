/**
 * The changed-answers list (see `changed-answers.ts`) as spreadsheet rows, for
 * `downloadSheet`. Pure, so it is tested without a browser.
 */

import { formatPhone } from '@/lib/phone';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import type { SheetRow } from '@/lib/sheet';
import type { AnswerStep, ChangedAnswer } from '@/features/guests/utils/changed-answers';

/** Reads a key of `guests.directory.changedAnswers`. */
export type ChangedAnswersT = (key: string, values?: Record<string, number>) => string;

const ISRAEL_TIME = {
  timeZone: ADMIN_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
} as const;
const DATE_TIME = new Intl.DateTimeFormat('en-GB', { ...ISRAEL_TIME, year: 'numeric' });
const SHORT_DATE_TIME = new Intl.DateTimeFormat('en-GB', ISRAEL_TIME);

const when = (at: string | null, format: Intl.DateTimeFormat) =>
  at ? format.format(new Date(at)).replace(',', '') : '';

const KIND_KEY = { declined: 'kindDeclined', confirmed: 'kindConfirmed', count: 'kindCount' } as const;

export function buildChangedAnswersSheetRows(
  rows: ChangedAnswer[],
  { t, rtl }: { t: ChangedAnswersT; rtl: boolean },
): SheetRow[] {
  const answer = (step: AnswerStep) =>
    step.status === 'declined'
      ? t('notComing')
      : step.amount === null
        ? t('comingNoCount')
        : t('coming', { count: step.amount });
  const arrow = rtl ? ' ← ' : ' → ';

  return [
    ['name', 'phone', 'previous', 'current', 'kind', 'changedAt', 'history'].map((key) => t(key)),
    ...rows.map((row) => [
      row.name,
      formatPhone(row.phone),
      answer(row.previous),
      answer(row.current),
      t(KIND_KEY[row.kind]),
      when(row.current.at, DATE_TIME),
      row.history
        .map((step) => {
          const at = when(step.at, SHORT_DATE_TIME);
          return at ? `${answer(step)} (${at})` : answer(step);
        })
        .join(arrow),
    ]),
  ];
}
