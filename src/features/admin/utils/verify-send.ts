/**
 * The verified send's own record of what actually arrived.
 *
 * Nothing here touches the database. `message_deliveries` records what the
 * WhatsApp API accepted, which is exactly the thing a verified run exists to
 * distrust - the Operator is reading Meta's own send counter and answering a
 * question the API response cannot: did it leave. So the marks live in the
 * browser, keyed by schedule, and are deliberately not reconciled back.
 *
 * Guest name and phone are stored alongside each mark rather than looked up at
 * the end. Once a guest has been sent to they drop out of the server's queue,
 * so a run reopened tomorrow could otherwise show a not-received list of bare
 * ids it can no longer resolve.
 */

export type VerifyMark = 'received' | 'not-received';

export type VerifyRecord = {
  mark: VerifyMark;
  name: string;
  phone: string;
};

export type VerifyMarks = Record<string, VerifyRecord>;

export type VerifyTally = {
  received: number;
  notReceived: number;
  total: number;
};

/** Bumped only if the stored shape changes; older payloads are dropped, not migrated. */
const STORAGE_VERSION = 1;

export function verifyStorageKey(scheduleId: string): string {
  return `kululu:verify-send:v${STORAGE_VERSION}:${scheduleId}`;
}

function isRecord(value: unknown): value is VerifyRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VerifyRecord>;
  return (
    (candidate.mark === 'received' || candidate.mark === 'not-received') &&
    typeof candidate.name === 'string' &&
    typeof candidate.phone === 'string'
  );
}

/**
 * Reads a stored run back.
 *
 * Every failure returns an empty set rather than throwing: this is one browser's
 * scratch notes, and a run that refuses to open because a key holds junk is
 * worse than a run that starts with an empty tally.
 */
export function parseVerifyMarks(raw: string | null | undefined): VerifyMarks {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const marks: VerifyMarks = {};
  for (const [guestId, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (isRecord(value)) {
      marks[guestId] = { mark: value.mark, name: value.name, phone: value.phone };
    }
  }
  return marks;
}

export function serializeVerifyMarks(marks: VerifyMarks): string {
  return JSON.stringify(marks);
}

export function tallyVerifyMarks(marks: VerifyMarks): VerifyTally {
  const values = Object.values(marks);
  const received = values.filter((record) => record.mark === 'received').length;
  return {
    received,
    notReceived: values.length - received,
    total: values.length,
  };
}

/** The not-received guests, in the order they were marked. */
export function notReceivedRecords(marks: VerifyMarks): VerifyRecord[] {
  return Object.values(marks).filter((record) => record.mark === 'not-received');
}

/**
 * Tab separated so it pastes into a spreadsheet as two columns, and still reads
 * as a list in a plain message box.
 */
export function formatNotReceivedForClipboard(records: VerifyRecord[]): string {
  return records.map((record) => `${record.name}\t${record.phone}`).join('\n');
}
