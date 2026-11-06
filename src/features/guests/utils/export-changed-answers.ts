/**
 * Client-side: writes the changed-answers list (see `changed-answers.ts`) to an
 * .xlsx the Owner can open or forward. A note on the first row says which
 * answers the list can see, since it misses those given through the direct
 * invitation link or on a call.
 */

import { formatPhone } from '@/lib/phone';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import type {
  AnswerChangeKind,
  AnswerStep,
  ChangedAnswer,
} from '@/features/guests/utils/changed-answers';

export type ChangedAnswersLabels = {
  sheetName: string;
  note: string;
  /** name, phone, previous, current, kind, changed at, all answers */
  headers: [string, string, string, string, string, string, string];
  coming: (amount: number | null) => string;
  notComing: string;
  kinds: Record<AnswerChangeKind, string>;
  /** Joins the steps of the answer history, pointing in reading order. */
  arrow: string;
  rtl: boolean;
};

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: ADMIN_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const SHORT_DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: ADMIN_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const when = (at: string | null, format: Intl.DateTimeFormat) =>
  at ? format.format(new Date(at)).replace(',', '') : '';

export async function exportChangedAnswers(
  rows: ChangedAnswer[],
  opts: { fileName: string; labels: ChangedAnswersLabels },
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');
  const { labels } = opts;

  const answer = (step: AnswerStep) =>
    step.status === 'confirmed' ? labels.coming(step.amount) : labels.notComing;
  const historyOf = (row: ChangedAnswer) =>
    row.history
      .map((step) => {
        const at = when(step.at, SHORT_DATE_TIME);
        return at ? `${answer(step)} (${at})` : answer(step);
      })
      .join(` ${labels.arrow} `);

  const aoa = [
    [labels.note],
    [],
    labels.headers,
    ...rows.map((row) => [
      row.name,
      formatPhone(row.phone),
      answer(row.previous),
      answer(row.current),
      labels.kinds[row.kind],
      when(row.changedAt, DATE_TIME),
      historyOf(row),
    ]),
  ];

  const ws = utils.aoa_to_sheet(aoa);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: labels.headers.length - 1 } }];
  ws['!cols'] = [24, 14, 16, 16, 22, 18, 60].map((wch) => ({ wch }));

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, labels.sheetName);
  if (labels.rtl) wb.Workbook = { ...wb.Workbook, Views: [{ RTL: true }] };
  writeFile(wb, opts.fileName, { bookType: 'xlsx' });
}
