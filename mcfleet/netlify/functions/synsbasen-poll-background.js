// Polls Synsbasen API for vehicles with inspection due within 90 days.
// Triggered by synsbasen-webhook.js when vehicles.updated fires (weekly, Monday).
// Background function — returnerer 202 straks, kører op til 15 minutter.

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
const SYNS_KEY = process.env.SYNSBASEN_API_KEY;

async function supa(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method: opts.method || "GET",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
    },
    body: opts.body,
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

function normDate(raw) {
  return raw ? raw.split("+")[0].split("T")[0] : null;
}

exports.handler = async () => {
  if (!SUPA_KEY || !SYNS_KEY) {
    console.error("Mangler SUPABASE_SERVICE_KEY eller SYNSBASEN_API_KEY");
    return;
  }

  // Cutoff: i dag + 90 dage — tjek kun MC'er med syn snart eller overskredet
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 90);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const kandidater = await supa(
    `mcs?select=id,reg,syn,naeste_syn&naeste_syn=lte.${cutoffStr}&order=naeste_syn.asc`
  );

  console.log(`Polling ${kandidater.length} MC'er med syn inden for 90 dage (cutoff: ${cutoffStr})`);

  let opdateret = 0;
  let uændret = 0;
  let fejl = 0;

  for (const mc of kandidater) {
    const reg = (mc.reg || "").replace(/\s+/g, "").toUpperCase();
    if (!reg) continue;

    try {
      const res = await fetch(
        `https://api.synsbasen.dk/v1/vehicles/registration/${encodeURIComponent(reg)}`,
        { headers: { Authorization: `Bearer ${SYNS_KEY}`, "Content-Type": "application/json" } }
      );

      if (res.status === 404) {
        console.log(`Ikke fundet i Synsbasen: ${reg}`);
        uændret++;
        continue;
      }
      if (!res.ok) {
        console.error(`Synsbasen HTTP ${res.status} for ${reg}`);
        fejl++;
        continue;
      }

      const d = (await res.json())?.data;
      if (!d) { uændret++; continue; }

      const update = {};
      const nySyn = normDate(d.last_inspection_date);
      const nyNaeste = d.next_inspection_date_estimate || d.next_inspection_date;

      if (nySyn && nySyn !== mc.syn) update.syn = nySyn;
      if (nyNaeste && nyNaeste !== (mc.naeste_syn || "")) update.naeste_syn = nyNaeste;

      if (Object.keys(update).length > 0) {
        await supa(`mcs?id=eq.${mc.id}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify(update),
        });
        console.log(`Opdateret ${reg}:`, update);
        opdateret++;
      } else {
        uændret++;
      }
    } catch (err) {
      console.error(`Fejl ved polling af ${reg}:`, err.message);
      fejl++;
    }

    // Lille pause for at respektere Synsbasens rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`Poll færdig — opdateret: ${opdateret}, uændret: ${uændret}, fejl: ${fejl}`);
};
