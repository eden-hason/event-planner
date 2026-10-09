/**
 * PostgREST's `max_rows`: no response carries more rows than this, whatever the
 * query asks for, and nothing says the result was cut short. 1,000 is the
 * Supabase default and what supabase/config.toml sets locally.
 */
export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * An embedded `relation(count)` comes back as `[{ count }]`. Aliased and
 * filtered, one query can count several slices of the same relation per parent
 * row: `pending:guests(count)` with `.eq('pending.rsvp_status', 'pending')`.
 */
export function embeddedCount(value: { count: number }[] | null | undefined): number {
  return value?.[0]?.count ?? 0;
}

/**
 * Every row a query matches, read a page at a time past the `max_rows` cap.
 *
 * Reach for this only when the rows themselves are needed. A count or a
 * per-parent tally belongs in the database instead - an embedded
 * `relation(count)` or `{ count: 'exact', head: true }` - which never meets the
 * cap at all.
 *
 * The query must be ordered on a unique column (usually `id`): ranges over an
 * unordered result can repeat or skip rows between pages. Throws on the first
 * failed page, so a partial list is never mistaken for the whole one.
 */
export async function pageAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
