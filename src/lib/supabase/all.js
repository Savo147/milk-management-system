/**
 * Every row of a query, not the first thousand.
 *
 * PostgREST caps a request at the project's "max rows" — 1000 by default —
 * and says nothing when it does: the rows simply stop, and anything summed
 * from them comes out short. On a page about money that is the worst way to
 * be wrong, because the figure still looks like a figure. A year of daily
 * milk entries passes that mark on its own.
 *
 * So the pages are walked until one comes back short of a full page.
 *
 * Takes a factory rather than a query, because a Supabase query builder is a
 * thenable that can only be awaited once — handing the same one back for the
 * second page would return the first page again.
 *
 *   const { data, error } = await fetchAll(() =>
 *     supabase.from("milk_entries").select("date, total_amount").lte("date", to),
 *   );
 */
export async function fetchAll(makeQuery, pageSize = 1000) {
  const all = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await makeQuery().range(
      offset,
      offset + pageSize - 1,
    );

    if (error) return { data: null, error };

    all.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) return { data: all, error: null };
  }
}
