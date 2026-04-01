// Synsbasen webhook handler
// Receives POST events when watched vehicles get new inspections or data updates.
// Events: inspection.created, vehicle.updated, vehicle.inspection_invoked, inspections.updated, vehicles.updated
const crypto = require("crypto");

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

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

async function findMcs(reg, vin) {
  if (reg) {
    const regNorm = reg.replace(/\s+/g, "").toUpperCase();
    const rows = await supa(`mcs?reg=ilike.${encodeURIComponent(regNorm)}&select=id,reg,syn,naeste_syn`);
    if (rows.length > 0) return rows;
  }
  if (vin) {
    const rows = await supa(`mcs?stel=eq.${encodeURIComponent(vin)}&select=id,reg,syn,naeste_syn`);
    if (rows.length > 0) return rows;
  }
  return [];
}

async function patchMc(id, update) {
  if (Object.keys(update).length === 0) return;
  await supa(`mcs?id=eq.${id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(update) });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Signature verification (optional — only if SYNSBASEN_WEBHOOK_SECRET is set)
  const secret = process.env.SYNSBASEN_WEBHOOK_SECRET;
  if (secret) {
    const sig = event.headers["x-synsbasen-signature"] || "";
    const hmac = crypto.createHmac("sha256", secret).update(event.body || "").digest("hex");
    const valid = sig.length === hmac.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
    if (!valid) return { statusCode: 401, body: "Invalid signature" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { event: eventType, data } = payload;
  console.log("Synsbasen webhook:", eventType);

  // #region agent log
  fetch('http://127.0.0.1:7596/ingest/51db5941-ab4f-4f63-810a-41abc8b01629',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f05d67'},body:JSON.stringify({sessionId:'f05d67',location:'synsbasen-webhook.js:68',message:'WEBHOOK_RECEIVED',data:{eventType,hasData:data!==null&&data!==undefined,dataKeys:data?Object.keys(data):[],rawDataSample:JSON.stringify(data)?.slice(0,300)},timestamp:Date.now(),hypothesisId:'H-A,H-D'})}).catch(()=>{});
  // #endregion

  try {
    if (eventType === "inspection.created" && data) {
      // data is an inspection object — extract vehicle reg/vin and inspection date
      const reg = data.vehicle?.registration || data.registration;
      const vin = data.vehicle?.vin || data.vin;
      const inspDate = normDate(data.inspection_date || data.date || "");

      // #region agent log
      fetch('http://127.0.0.1:7596/ingest/51db5941-ab4f-4f63-810a-41abc8b01629',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f05d67'},body:JSON.stringify({sessionId:'f05d67',location:'synsbasen-webhook.js:78',message:'INSPECTION_CREATED_PARSED',data:{reg,vin,inspDate},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
      // #endregion

      const mcs = await findMcs(reg, vin);

      // #region agent log
      fetch('http://127.0.0.1:7596/ingest/51db5941-ab4f-4f63-810a-41abc8b01629',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f05d67'},body:JSON.stringify({sessionId:'f05d67',location:'synsbasen-webhook.js:80',message:'FINDMCS_RESULT',data:{reg,vin,found:mcs.length,mcs:mcs.map(m=>({id:m.id,reg:m.reg}))},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
      // #endregion

      for (const mc of mcs) {
        const update = {};
        if (inspDate) update.syn = inspDate;
        await patchMc(mc.id, update);
        console.log(`Updated syn for MC ${mc.reg} → ${inspDate}`);
      }
    }

    else if (eventType === "vehicle.updated" && data) {
      const reg = data.registration;
      const vin = data.vin;

      // #region agent log
      fetch('http://127.0.0.1:7596/ingest/51db5941-ab4f-4f63-810a-41abc8b01629',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f05d67'},body:JSON.stringify({sessionId:'f05d67',location:'synsbasen-webhook.js:90',message:'VEHICLE_UPDATED_PARSED',data:{reg,vin,last_inspection_date:data.last_inspection_date,next_inspection_date_estimate:data.next_inspection_date_estimate},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
      // #endregion

      const mcs = await findMcs(reg, vin);
      for (const mc of mcs) {
        const update = {};
        if (data.last_inspection_date) update.syn = normDate(data.last_inspection_date);
        const naeste = data.next_inspection_date_estimate || data.next_inspection_date;
        if (naeste) update.naeste_syn = naeste;
        if (data.vin && !mc.stel) update.stel = data.vin;
        await patchMc(mc.id, update);
        console.log(`Updated vehicle data for MC ${mc.reg}`, update);
      }
    }

    else if (eventType === "vehicle.inspection_invoked" && data) {
      // Vehicle called in for periodic inspection — 8 weeks before next_inspection_date
      const reg = data.registration;
      const vin = data.vin;
      const naeste = data.next_inspection_date_estimate || data.next_inspection_date;

      const mcs = await findMcs(reg, vin);
      for (const mc of mcs) {
        const update = {};
        if (naeste) update.naeste_syn = naeste;
        await patchMc(mc.id, update);
        console.log(`Inspection invoked for MC ${mc.reg}, næste syn: ${naeste}`);
      }
    }

    else {
      // #region agent log
      fetch('http://127.0.0.1:7596/ingest/51db5941-ab4f-4f63-810a-41abc8b01629',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f05d67'},body:JSON.stringify({sessionId:'f05d67',location:'synsbasen-webhook.js:118',message:'EVENT_NOT_HANDLED',data:{eventType,dataIsNull:data===null,reason:!data?'data_is_null':'unknown_event_type'},timestamp:Date.now(),hypothesisId:'H-A,H-D'})}).catch(()=>{});
      // #endregion
    }

    // inspections.updated and vehicles.updated are batch events with no vehicle-specific data — just acknowledge
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    // #region agent log
    fetch('http://127.0.0.1:7596/ingest/51db5941-ab4f-4f63-810a-41abc8b01629',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f05d67'},body:JSON.stringify({sessionId:'f05d67',location:'synsbasen-webhook.js:122',message:'HANDLER_ERROR',data:{error:err.message},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
    // #endregion
    // Return 200 anyway to prevent Synsbasen from retrying indefinitely
    return { statusCode: 200, body: JSON.stringify({ received: true, error: err.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true, event: eventType }) };
};
