/**
 * Henter alle rækker i bidder for at undgå PostgreSQL statement timeout (57014)
 * ved store tabeller — én stor SELECT kan overskride Supabase' timeout.
 */
export async function fetchAllRows(
  supabase,
  table,
  {
    orderBy = "id",
    ascending = true,
    pageSize = 400,
    select = "*",
  } = {}
) {
  const rows = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending })
      .range(from, to);
    if (error) {
      const msg =
        error.message ||
        (error.details ? `${error.code}: ${error.details}` : JSON.stringify(error));
      throw new Error(msg);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
