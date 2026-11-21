import type { ColumnMapping } from './import-guests';

/**
 * The downloadable Excel template for the guest import (issue #617).
 *
 * The import has no fixed column contract - an AI step maps columns by header
 * text and sample values (`analyze-csv.ts`) - so the template's job is only to
 * offer headers that map without doubt. Four columns, in this order: name,
 * guest count, phone, side. The side header names its accepted values
 * (`normalizeSide` takes bride/groom and כלה/חתן).
 *
 * No example rows: a forgotten "Jane Cohen" would import as a real guest.
 */

export type TemplateLocale = 'he' | 'en';

export const GUEST_IMPORT_TEMPLATE_HEADERS: Record<
  TemplateLocale,
  readonly [string, string, string, string]
> = {
  he: ['שם האורח', 'כמות מוזמנים', 'מספר טלפון', 'צד (חתן / כלה)'],
  en: ['Guest name', 'Number of guests', 'Phone number', 'Side (groom / bride)'],
};

/** The mapping the template's columns are meant to land on, by position. */
export const GUEST_IMPORT_TEMPLATE_MAPPING: ColumnMapping = {
  0: 'name',
  1: 'amount',
  2: 'phone',
  3: 'side',
};

const PHONE_COLUMN = 2;

// Rows whose phone cell is pre-formatted as text. Without it Excel turns
// 0541234567 into the number 541234567 and drops the leading zero. Empty cells
// are skipped by the parser, so unused rows cost nothing on upload.
export const TEMPLATE_TEXT_PHONE_ROWS = 500;

const COLUMN_WIDTHS = [26, 16, 18, 20];

function templateLocale(locale: string): TemplateLocale {
  return locale === 'he' ? 'he' : 'en';
}

export const GUEST_IMPORT_TEMPLATE_FILE_NAME = 'kululu-guest-list-template.xlsx';

/** Builds the template as an .xlsx file's bytes. */
export async function buildGuestImportTemplate(
  locale: string,
): Promise<ArrayBuffer> {
  const { utils, write } = await import('xlsx');
  const lang = templateLocale(locale);

  const sheet = utils.aoa_to_sheet([[...GUEST_IMPORT_TEMPLATE_HEADERS[lang]]]);
  for (let row = 1; row <= TEMPLATE_TEXT_PHONE_ROWS; row++) {
    sheet[utils.encode_cell({ r: row, c: PHONE_COLUMN })] = {
      t: 's',
      v: '',
      z: '@',
    };
  }
  sheet['!ref'] = utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: TEMPLATE_TEXT_PHONE_ROWS, c: COLUMN_WIDTHS.length - 1 },
  });
  sheet['!cols'] = COLUMN_WIDTHS.map((wch) => ({ wch }));

  const workbook = utils.book_new();
  utils.book_append_sheet(
    workbook,
    sheet,
    lang === 'he' ? 'מוזמנים' : 'Guests',
  );
  if (lang === 'he') {
    workbook.Workbook = { Views: [{ RTL: true }] };
  }

  return write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/** Builds the template and hands it to the browser as a download. */
export async function downloadGuestImportTemplate(locale: string) {
  const bytes = await buildGuestImportTemplate(locale);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = GUEST_IMPORT_TEMPLATE_FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
