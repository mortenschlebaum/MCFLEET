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
      return { statusCode: resp.status, body: JSON.stringify({ error: "Firma.dev error", detail: errText }) };
    }

    const sr = await resp.json();

    // #region agent log
    if (event.queryStringParameters?.debug === "1") {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        all_top_keys: Object.keys(sr),
        certificate_full: sr.certificate,
        certificate_keys: sr.certificate ? Object.keys(sr.certificate) : null,
        status: sr.status,
        document_url_preview: sr.document_url ? sr.document_url.substring(0, 100) + "..." : null,
      }, null, 2) };
    }
    // #endregion

    const isFinished = sr.status?.finished === true;
    const signedDocUrl = sr.certificate?.final_document_download_url
      || sr.certificate?.document_only_download_url
      || null;

    if (isFinished && signedDocUrl) {
      return { statusCode: 302, headers: { Location: signedDocUrl }, body: "" };
    }

    const statusClass = isFinished ? "signed" : sr.status?.cancelled ? "cancelled" : sr.status?.expired ? "expired" : "pending";
    const statusText = isFinished
      ? (signedDocUrl ? "Underskrevet" : "Underskrevet — dokument genereres...")
      : sr.status?.cancelled ? "Annulleret" : sr.status?.expired ? "Udløbet" : "Afventer underskrift";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing status</title>
      <style>body{font-family:system-ui;background:#1a1a2e;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:#16213e;border-radius:12px;padding:32px 40px;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)}
      h2{margin:0 0 12px}p{color:#aaa;margin:4px 0;font-size:14px}.badge{display:inline-block;padding:6px 16px;border-radius:20px;font-weight:600;margin:12px 0}
      .pending{background:#2d1f00;color:#ffd166;border:1px solid #e6a81755}.signed{background:#0a2d1a;color:#6ee7b7;border:1px solid #22a06b55}
      .cancelled{background:#2d0a0a;color:#f87171;border:1px solid #cc000055}.expired{background:#2d1a0a;color:#ffa366;border:1px solid #cc660055}
      .hint{color:#666;font-size:12px;margin-top:16px}</style></head>
      <body><div class="card"><h2>${sr.name || "Slutseddel"}</h2>
      <div class="badge ${statusClass}">${statusText}</div>
      <p>Oprettet: ${sr.timestamps?.created_on ? new Date(sr.timestamps.created_on).toLocaleDateString("da-DK") : "—"}</p>
      ${sr.timestamps?.finished_on ? `<p>Underskrevet: ${new Date(sr.timestamps.finished_on).toLocaleDateString("da-DK")}</p>` : ""}
      ${sr.expires_at && !isFinished ? `<p>Udløber: ${new Date(sr.expires_at).toLocaleDateString("da-DK")}</p>` : ""}
      ${isFinished && !signedDocUrl ? `<p class="hint">Dokumentet er ved at blive genereret. Prøv igen om et øjeblik.</p>` : ""}
      ${!isFinished ? `<p class="hint">Dokumentet kan først hentes når alle parter har underskrevet.</p>` : ""}
      </div></body></html>`;

    return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8" }, body: html };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
