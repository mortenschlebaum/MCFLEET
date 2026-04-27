const FIRMA_API = "https://api.firma.dev/functions/v1/signing-request-api";

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const FIRMA_KEY = process.env.FIRMA_API_KEY;
  if (!FIRMA_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "FIRMA_API_KEY not configured" }) };
  }

  const id = event.queryStringParameters?.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing ?id= parameter" }) };
  }

  try {
    const resp = await fetch(`${FIRMA_API}/signing-requests/${id}`, {
      headers: { Authorization: `Bearer ${FIRMA_KEY}` },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: "Firma.dev error", detail: errText }),
      };
    }

    const sr = await resp.json();

    // Log rå recipients for fejlfinding første gang
    console.log("firma-signers sr.recipients:", JSON.stringify(sr.recipients));
    console.log("firma-signers sr.status:", JSON.stringify(sr.status));

    // Returner rå sr-nøgler og recipients for at debugge hvad Firma.dev faktisk sender
    const srKeys = Object.keys(sr);
    const rawRecipients = sr.recipients || sr.signers || sr.users || null;

    const recipients = Array.isArray(rawRecipients) ? rawRecipients : [];

    const signers = recipients.map((r) => {
      const firstName = r.first_name || r.firstName || "";
      const lastName  = r.last_name  || r.lastName  || "";
      const name      = [firstName, lastName].filter(Boolean).join(" ") || r.name || r.email || "Ukendt";
      const email     = r.email || "";

      const signedAt =
        r.signed_at              ||
        r.signedAt               ||
        r.finished_at            ||
        r.date_signed            ||
        r.timestamps?.signed_on  ||
        r.timestamps?.finished_on ||
        null;

      const signed =
        r.signed === true         ||
        r.has_signed === true     ||
        r.status === "signed"     ||
        r.status === "finished"   ||
        r.status === "completed"  ||
        signedAt !== null;

      return { name, email, signed, signed_at: signedAt, _raw: r };
    });

    const topStatus =
      typeof sr.status === "string"
        ? sr.status
        : sr.status?.finished  ? "finished"
        : sr.status?.cancelled ? "cancelled"
        : sr.status?.expired   ? "expired"
        : "in_progress";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: topStatus, signers, _debug: { srKeys, rawRecipients } }),
    };
  } catch (err) {
    console.error("firma-signers error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
