type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/**
 * The sentence the Owner sees when `upsertGuest` fails, in the `guests`
 * namespace. A phone already in the list names who has it. The seating
 * capacity guard (ADR-0008) raises a parseable message inside Postgres, which
 * `upsertGuest` passes through untranslated; it becomes the same shortfall
 * sentence the Seating Plan shows rather than a bare database error.
 */
export function describeUpsertFailure(
  result: { message?: string | null; phoneTakenBy?: string | null },
  t: Translate,
): string {
  if (result.phoneTakenBy !== undefined) {
    return result.phoneTakenBy
      ? t('form.phoneTakenBy', { name: result.phoneTakenBy })
      : t('form.phoneTaken');
  }
  const raw = result.message;
  if (!raw) return t('form.somethingWentWrong');
  if (raw.includes('seating_over_capacity')) {
    const read = (key: string) =>
      Number(new RegExp(`${key}=(-?\\d+)`).exec(raw)?.[1] ?? 0);
    return t('form.table.overCapacity', {
      party: read('party'),
      free: read('free'),
      shortfall: read('shortfall'),
    });
  }
  if (raw.includes('seating_table_not_found')) return t('form.table.tableGone');
  return raw;
}
