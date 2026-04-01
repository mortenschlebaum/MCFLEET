// Synkroniser alle aktive MC'er fra Supabase til Synsbasens watched_vehicles.
// Background function — returnerer 202 straks og kører op til 15 minutter.
// Kald via: POST https://mc.lisbeth.dk/.netlify/functions/synsbasen-sync-watched-background
// Idempotent — kører trygt flere gange.

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
const SYNS_KEY = process.env.SYNSBASEN_API_KEY;

async function supaGet(path) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function synsbasen(method, path, body) {
  const res = await fetch(`https://api.synsbasen.dk/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SYNS_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

exports.handler = async () => {
  if (!SUPA_KEY || !SYNS_KEY) {
    console.error("Mangler SUPABASE_SERVICE_KEY eller SYNSBASEN_API_KEY");
    return;
  }

  // Hent alle MC'er — paginer for at få alle
  let allMcs = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const rows = await supaGet(
      `mcs?select=id,reg,stel&order=id.asc&limit=${pageSize}&offset=${page * pageSize}`
    );
    allMcs = allMcs.concat(rows);
    if (rows.length < pageSize) break;
    page++;
  }

  console.log(`Fandt ${allMcs.length} MC'er i Supabase`);

  // Hent allerede overvågede køretøjer fra Synsbasen (op til 100)
  const existingRes = await synsbasen("GET", "/watched_vehicles?per_page=100");
  const alreadyWatched = new Set(
    (existingRes.body?.data || []).map((w) => String(w.vehicle_id))
  );
  console.log(`Allerede overvåget: ${alreadyWatched.size} køretøjer`);

  const results = { tilmeldt: [], allerede: [], fejl: [], ikkeFundet: [] };

  for (const mc of allMcs) {
    const reg = (mc.reg || "").replace(/\s+/g, "").toUpperCase();
    if (!reg) continue;

    // Slå op i Synsbasen for at få vehicle_id
    const lookup = await synsbasen("GET", `/vehicles/registration/${encodeURIComponent(reg)}`);

    if (lookup.status === 404 || !lookup.body?.data?.id) {
      console.log(`Ikke fundet i Synsbasen: ${reg}`);
      results.ikkeFundet.push(reg);
      continue;
    }

    const vehicleId = lookup.body.data.id;

    if (alreadyWatched.has(String(vehicleId))) {
      console.log(`Allerede overvåget: ${reg} (${vehicleId})`);
      results.allerede.push(reg);
      continue;
    }

    // Tilmeld til watched_vehicles
    const watch = await synsbasen("POST", "/watched_vehicles", { vehicle_id: vehicleId });

    if (watch.status === 200 || watch.status === 201) {
      console.log(`✓ Tilmeldt: ${reg} (${vehicleId})`);
      results.tilmeldt.push(reg);
      alreadyWatched.add(String(vehicleId));
    } else if (watch.status === 422) {
      console.log(`Allerede overvåget (422): ${reg}`);
      results.allerede.push(reg);
    } else {
      console.error(`Fejl ved tilmelding af ${reg}:`, watch.status, watch.body);
      results.fejl.push({ reg, status: watch.status, body: watch.body });
    }

    // Lille pause for ikke at overbelaste API
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log("Sync færdig:", JSON.stringify({
    total: allMcs.length,
    tilmeldt: results.tilmeldt.length,
    allerede: results.allerede.length,
    ikkeFundet: results.ikkeFundet.length,
    fejl: results.fejl.length,
    detaljer: results,
  }));
};
