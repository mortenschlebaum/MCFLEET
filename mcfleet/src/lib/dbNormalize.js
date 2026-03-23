/** Mapper almindelige snake_case Postgres-kolonner til appens camelCase. */
export function normalizeMcFromDb(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  if (out.mc_nr != null && out.mcNr == null) out.mcNr = out.mc_nr;
  if (out.lokations_log != null && out.lokationsLog == null) out.lokationsLog = out.lokations_log;
  if (out.km_log != null && out.kmLog == null) out.kmLog = out.km_log;
  return out;
}

export function normalizeOpgaveFromDb(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  if (out.mc_id != null && out.mcId == null) out.mcId = out.mc_id;
  return out;
}
