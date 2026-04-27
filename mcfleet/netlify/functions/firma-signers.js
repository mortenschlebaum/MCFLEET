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
    // Hent individuelle underskriverstatus via /users endpoint
    const resp = await fetch(`${FIRMA_API}/signing-requests/${id}/users`, {
      headers: { Authorization: `Bearer ${FIRMA_KEY}` },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: "Firma.dev error", detail: errText }),
      };
    }

    const data = await resp.json();
    const users = Array.isArray(data.results) ? data.results : [];

    const signers = users
      .filter(u => u.designation === "Signer" || u.designation === "Approver" || !u.designation)
      .map(u => ({
        name: u.name || [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Ukendt",
        email: u.email || "",
        signed: u.finished_on !== null && u.finished_on !== undefined,
        signed_at: u.finished_on || null,
        declined: u.declined_on !== null && u.declined_on !== undefined,
        order: u.order || null,
      }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signers }),
    };
  } catch (err) {
    console.error("firma-signers error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
