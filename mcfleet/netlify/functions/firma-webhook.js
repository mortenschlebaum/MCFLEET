const crypto = require("crypto");

function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return !secret;
  const parts = {};
  signatureHeader.split(",").forEach(p => {
    const [k, ...rest] = p.split("=");
    parts[k] = rest.join("=");
  });
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

async function supaUpdate(envelopeId, patch) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || !envelopeId) return;
  await fetch(`${url}/rest/v1/signatures?envelope_id=eq.${envelopeId}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
}

async function supaGetByEnvelope(envelopeId) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || !envelopeId) return null;
  try {
    const resp = await fetch(
      `${url}/rest/v1/signatures?envelope_id=eq.${envelopeId}&select=mc_reg,buyer_name,buyer_email&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await resp.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch { return null; }
}

async function sendSignedNotification(sigRow, signedAt) {
  const key = process.env.RESEND_API_KEY;
  // #region agent log
  console.log(`[DBG-c3a9ce] H-B sendSignedNotification: hasKey=${!!key} hasRow=${!!sigRow}`);
  // #endregion
  if (!key || !sigRow) return;
  const dato = new Date(signedAt).toLocaleDateString("da-DK");
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "MCFleet <noreply@lisbeth.dk>",
        to: ["morten.s@lisbeth.dk"],
        subject: `Slutseddel underskrevet – ${sigRow.mc_reg}`,
        html: `<p>Slutseddel for <strong>${sigRow.mc_reg}</strong> er nu underskrevet af alle parter.</p>
               <p><strong>Køber:</strong> ${sigRow.buyer_name} (${sigRow.buyer_email})</p>
               <p><strong>Underskrevet:</strong> ${dato}</p>
               <p style="margin-top:16px"><a href="https://mc.lisbeth.dk/#slutsedler">Se slutsedler i MCFleet</a></p>`,
      }),
    });
    // #region agent log
    console.log(`[DBG-c3a9ce] H-D Resend response: status=${resp.status}`);
    // #endregion
    if (!resp.ok) {
      const err = await resp.text();
      console.error(`[DBG-c3a9ce] H-D Resend error body: ${err}`);
    }
  } catch (e) {
    console.error(`[DBG-c3a9ce] sendSignedNotification exception: ${e}`);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "OK" };
  }

  const rawBody = event.body || "";
  const secret = process.env.FIRMA_WEBHOOK_SECRET || "";
  const sigHeader = event.headers["x-firma-signature"] || "";
  const sigHeaderOld = event.headers["x-firma-signature-old"] || "";

  if (secret) {
    const valid = verifySignature(rawBody, sigHeader, secret)
      || verifySignature(rawBody, sigHeaderOld, secret);
    if (!valid) {
      console.error("Firma webhook: invalid signature");
      return { statusCode: 401, body: "Invalid signature" };
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 200, body: "OK" };
  }

  const eventType = payload.event_type || "";
  const data = payload.data || {};
  const signingRequestId = data.signing_request_id || "";

  // #region agent log
  console.log(`[DBG-c3a9ce] H-A/H-E webhook reached: eventType="${eventType}" signingRequestId="${signingRequestId}" allKeys=${JSON.stringify(Object.keys(data))}`);
  // #endregion

  try {
    if (eventType === "signing_request.completed") {
      const signedAt = data.finished_date || new Date().toISOString();
      const sigRow = await supaGetByEnvelope(signingRequestId);
      // #region agent log
      console.log(`[DBG-c3a9ce] H-C sigRow from Supabase: ${JSON.stringify(sigRow)}`);
      // #endregion
      await supaUpdate(signingRequestId, { status: "signed", signed_at: signedAt });
      await sendSignedNotification(sigRow, signedAt);
    } else if (eventType === "signing_request.cancelled") {
      await supaUpdate(signingRequestId, { status: "cancelled" });
    } else if (eventType === "signing_request.expired") {
      await supaUpdate(signingRequestId, { status: "expired" });
    }
  } catch (e) {
    console.error("Firma webhook processing error:", e);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
