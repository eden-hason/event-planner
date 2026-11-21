import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  buildGuestImportTemplate,
  GUEST_IMPORT_TEMPLATE_FILE_NAME,
  GUEST_IMPORT_TEMPLATE_HEADERS,
  GUEST_IMPORT_TEMPLATE_MAPPING,
  TEMPLATE_TEXT_PHONE_ROWS,
} from './guest-import-template';
import { parseCSVFile } from './parse-csv';
import { transformCsvRow, validateCsvRows } from './import-guests';

const XLSX_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const asFile = (bytes: ArrayBuffer) =>
  new File([bytes], GUEST_IMPORT_TEMPLATE_FILE_NAME, { type: XLSX_TYPE });

/** Fills the template's first sheet the way a user would in Excel. */
function fillTemplate(bytes: ArrayBuffer, rows: string[][]): ArrayBuffer {
  const workbook = XLSX.read(bytes, { type: 'array', cellNF: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  XLSX.utils.sheet_add_aoa(sheet, rows, { origin: 'A2' });
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

for (const locale of ['he', 'en'] as const) {
  test(`${locale} template has the four columns, in order`, async () => {
    const parsed = await parseCSVFile(
      asFile(await buildGuestImportTemplate(locale)),
    );
    assert.deepEqual(parsed.headers, [...GUEST_IMPORT_TEMPLATE_HEADERS[locale]]);
    // Name, guest count, phone, side - and nothing else.
    assert.equal(parsed.headers.length, 4);
    // No example rows a user could forget and import as real guests.
    assert.deepEqual(parsed.rows, []);
  });
}

test('an unknown locale falls back to the English template', async () => {
  const parsed = await parseCSVFile(asFile(await buildGuestImportTemplate('fr')));
  assert.deepEqual(parsed.headers, [...GUEST_IMPORT_TEMPLATE_HEADERS.en]);
});

test('the Hebrew template opens right-to-left', async () => {
  const workbook = XLSX.read(await buildGuestImportTemplate('he'), {
    type: 'array',
  });
  assert.equal(workbook.Workbook?.Views?.[0]?.RTL, true);
});

test('phone cells are text, so Excel keeps the leading zero', async () => {
  const workbook = XLSX.read(await buildGuestImportTemplate('he'), {
    type: 'array',
    cellNF: true,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  for (const row of [2, TEMPLATE_TEXT_PHONE_ROWS + 1]) {
    assert.equal(sheet[`C${row}`]?.z, '@', `C${row} should be text`);
  }
  assert.equal(sheet.A2, undefined);
});

test('a filled-in template imports through the existing flow', async () => {
  const filled = fillTemplate(await buildGuestImportTemplate('he'), [
    ['עדן לוי', '2', '0541234567', 'כלה'],
    ['איתי מזרחי', '1', '052-7654321', 'חתן'],
    // Side is optional.
    ['Jane Cohen', '3', '+972 50 123 4567', ''],
  ]);

  const parsed = await parseCSVFile(asFile(filled));
  assert.equal(parsed.rows.length, 3);

  // The same mapping the import builds, row for row.
  assert.deepEqual(
    parsed.rows.map((row) =>
      transformCsvRow(row, GUEST_IMPORT_TEMPLATE_MAPPING),
    ),
    [
      { name: 'עדן לוי', amount: '2', phone: '0541234567', side: 'כלה', group: undefined },
      { name: 'איתי מזרחי', amount: '1', phone: '052-7654321', side: 'חתן', group: undefined },
      { name: 'Jane Cohen', amount: '3', phone: '+972 50 123 4567', side: undefined, group: undefined },
    ],
  );

  // Phone validity needs libphonenumber, whose metadata does not load under
  // the test runner (see `catch-up.test.ts`), so validation runs on the other
  // three columns; the phone text itself is checked above.
  const withoutPhone = { ...GUEST_IMPORT_TEMPLATE_MAPPING, 2: null };
  const validated = validateCsvRows(parsed.rows, withoutPhone);
  assert.deepEqual(
    validated.map((row) => row.errors),
    [[], [], []],
  );
  assert.deepEqual(
    validated.map(({ data }) => [data.name, data.amount, data.side]),
    [
      ['עדן לוי', 2, 'bride'],
      ['איתי מזרחי', 1, 'groom'],
      ['Jane Cohen', 3, null],
    ],
  );
});

test('the template mapping covers name, guest count, phone and side', () => {
  assert.deepEqual(Object.values(GUEST_IMPORT_TEMPLATE_MAPPING), [
    'name',
    'amount',
    'phone',
    'side',
  ]);
});
