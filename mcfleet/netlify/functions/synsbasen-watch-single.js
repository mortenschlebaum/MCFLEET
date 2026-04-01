// Registrer ét køretøj (via reg.nr.) som watched vehicle i Synsbasen.
// Kaldes fra App.jsx når en ny MC oprettes.
// POST { "reg": "AB12345" }

const SYNS_KEY = process.env.SYNSBASEN_API_KEY;

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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (!SYNS_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Mangler SYNSBASEN_API_KEY" }) };
  }

  let reg;
  try {
    const body = JSON.parse(event.body || "{}");
    reg = (body.reg || "").replace(/\s+/g, "").toUpperCase();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ugyldigt JSON" }) };
  }

  if (!reg || reg.length < 2) {
    return { statusCode: 400, body: JSON.stringify({ error: "Mangler reg" }) };
  }

  // Slå køretøjet op i Synsbasen
  const lookup = await synsbasen("GET", `/vehicles/registration/${encodeURIComponent(reg)}`);

  if (lookup.status === 404 || !lookup.body?.data?.id) {
    console.log(`Synsbasen: ikke fundet ${reg}`);
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: "not_found", reg }) };
  }

  const vehicleId = lookup.body.data.id;

  // Tilmeld til watched_vehicles
  const watch = await synsbasen("POST", "/watched_vehicles", { vehicle_id: vehicleId });

  if (watch.status === 200 || watch.status === 201) {
    console.log(`Synsbasen: tilmeldt ${reg} (${vehicleId})`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, reg, vehicleId }) };
  }
  if (watch.status === 422) {
    console.log(`Synsbasen: allerede overvåget ${reg}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, reason: "already_watched", reg, vehicleId }) };
  }

  console.error(`Synsbasen: fejl ved watch ${reg}`, watch.status, watch.body);
  return { statusCode: 200, body: JSON.stringify({ ok: false, reason: "watch_failed", status: watch.status }) };
};
