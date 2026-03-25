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

  console.log(`Firma webhook: ${eventType} for ${signingRequestId}`);

  try {
    if (eventType === "signing_request.completed") {
      await supaUpdate(signingRequestId, {
        status: "signed",
        signed_at: data.finished_date || new Date().toISOString(),
      });
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
