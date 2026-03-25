// Firma.dev digital signature — creates and sends a signing request for slutseddel PDFs
const FIRMA_API = "https://api.firma.dev/functions/v1/signing-request-api";

const SELLER_FIRST = "Nikolaj";
const SELLER_LAST  = "Schnor";
const SELLER_EMAIL = "nikolaj.s@lisbeth.dk";

function splitName(full) {
  const parts = (full || "").trim().split(/\s+/);
  if (parts.length === 0) return { first_name: "Køber", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

async function supaInsert(row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/signatures`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const FIRMA_KEY = process.env.FIRMA_API_KEY;
  if (!FIRMA_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "FIRMA_API_KEY not configured" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { pdfBase64, buyerEmail, buyerName, mcReg, mcId, sigPage } = payload;
  if (!pdfBase64 || !buyerEmail || !buyerName) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing pdfBase64, buyerEmail, or buyerName" }) };
  }
  const lastPage = sigPage || 2;

  const buyer = splitName(buyerName);

  try {
    const resp = await fetch(`${FIRMA_API}/signing-requests/create-and-send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRMA_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Slutseddel - ${mcReg || "MC"}`,
        document: pdfBase64,
        recipients: [
          {
            id: "temp_buyer",
            first_name: buyer.first_name,
            last_name: buyer.last_name,
            email: buyerEmail,
            designation: "Signer",
            order: 1,
          },
          {
            id: "temp_seller",
            first_name: SELLER_FIRST,
            last_name: SELLER_LAST,
            email: SELLER_EMAIL,
            designation: "Signer",
            order: 2,
          },
        ],
        fields: [
          {
            recipient_id: "temp_buyer",
            type: "signature",
            page: lastPage,
            x: 50, y: 17, width: 40, height: 5,
            required: true,
          },
          {
            recipient_id: "temp_seller",
            type: "signature",
            page: lastPage,
            x: 5, y: 17, width: 40, height: 5,
            required: true,
          },
        ],
        settings: {
          use_signing_order: false,
          send_signing_email: true,
          send_finish_email: true,
          attach_pdf_on_finish: true,
        },
        expiration_hours: 168,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Firma.dev error:", resp.status, errText);
      return { statusCode: 502, body: JSON.stringify({ error: "Firma.dev API error", detail: errText }) };
    }

    const result = await resp.json();
    const envelopeId = result.id || result.signing_request_id || "";

    await supaInsert({
      mc_id: mcId || 0,
      mc_reg: mcReg || "",
      envelope_id: envelopeId,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      status: "pending",
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, envelopeId }),
    };
  } catch (err) {
    console.error("firma-sign error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
