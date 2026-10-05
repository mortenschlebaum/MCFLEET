const crypto = require("crypto");

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const supa = async (path, opts = {}) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Serveren mangler database-nøgle");
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: opts.method || "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error("Databasefejl " + res.status + " " + text.slice(0, 180));
  return text ? JSON.parse(text) : [];
};

const kodeHash = (brugernavn, kode) => crypto
  .createHmac("sha256", process.env.SUPABASE_SERVICE_KEY)
  .update(brugernavn + "\n" + kode)
  .digest("hex");

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
}[c]));

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, fejl: "Kun POST" });

  let body = {};
  try { body = JSON.parse(event.body || "{}"); }
  catch { return json(400, { ok: false, fejl: "Ugyldig forespørgsel" }); }

  const brugernavn = String(body.brugernavn || "").trim();
  const handling = body.handling;
  if (!brugernavn) return json(400, { ok: false, fejl: "Skriv brugernavn" });

  try {
    const rows = await supa(
      "brugere?select=id,brugernavn,navn,email,reset_kode_hash,reset_udloeber&brugernavn=eq." +
      encodeURIComponent(brugernavn) + "&limit=1"
    );
    const bruger = Array.isArray(rows) ? rows[0] : null;
    if (!bruger) return json(404, { ok: false, fejl: "Ukendt brugernavn" });

    if (handling === "send") {
      const email = String(bruger.email || "").trim();
      if (!email || !email.includes("@")) {
        return json(400, { ok: false, fejl: "Der er ingen email på brugeren. Bed en administrator om at tilføje den under Brugere." });
      }
      const kode = String(crypto.randomInt(100000, 1000000));
      const udloeber = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await supa("brugere?id=eq." + bruger.id, {
        method: "PATCH",
        prefer: "return=minimal",
        body: { reset_kode_hash: kodeHash(bruger.brugernavn, kode), reset_udloeber: udloeber },
      });

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        await supa("brugere?id=eq." + bruger.id, {
          method: "PATCH",
          prefer: "return=minimal",
          body: { reset_kode_hash: null, reset_udloeber: null },
        });
        return json(500, { ok: false, fejl: "Email er ikke sat op på serveren" });
      }

      const mail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MCFleet <noreply@lisbeth.dk>",
          to: [email],
          subject: "MCFleet – kode til ny adgangskode",
          html: `<p>Hej ${esc(bruger.navn || bruger.brugernavn)}</p>
                 <p>Din kode til at vælge en ny adgangskode i MCFleet er:</p>
                 <p style="font-size:28px;font-weight:700;letter-spacing:4px">${kode}</p>
                 <p>Koden virker i 30 minutter. Hvis du ikke har bedt om den, kan du se bort fra mailen.</p>`,
        }),
      });
      if (!mail.ok) {
        await supa("brugere?id=eq." + bruger.id, {
          method: "PATCH",
          prefer: "return=minimal",
          body: { reset_kode_hash: null, reset_udloeber: null },
        });
        console.error("Resend fejl", mail.status);
        return json(502, { ok: false, fejl: "Kunne ikke sende email. Prøv igen om lidt." });
      }
      return json(200, { ok: true, besked: "Koden er sendt til emailen på brugeren." });
    }

    if (handling === "nulstil") {
      const kode = String(body.kode || "").trim();
      const nyKode = String(body.nyKode || "");
      if (!/^\d{6}$/.test(kode)) return json(400, { ok: false, fejl: "Koden skal være 6 cifre" });
      if (nyKode.length < 6) return json(400, { ok: false, fejl: "Ny adgangskode skal være mindst 6 tegn" });
      if (nyKode.length > 100) return json(400, { ok: false, fejl: "Adgangskoden er for lang" });
      if (!bruger.reset_kode_hash || !bruger.reset_udloeber) {
        return json(400, { ok: false, fejl: "Der er ingen aktiv kode. Bed om en ny." });
      }
      if (new Date(bruger.reset_udloeber).getTime() < Date.now()) {
        return json(400, { ok: false, fejl: "Koden er udløbet. Bed om en ny." });
      }
      const forventet = Buffer.from(bruger.reset_kode_hash);
      const aktuel = Buffer.from(kodeHash(bruger.brugernavn, kode));
      const ens = forventet.length === aktuel.length && crypto.timingSafeEqual(forventet, aktuel);
      if (!ens) return json(400, { ok: false, fejl: "Koden er forkert" });

      await supa("brugere?id=eq." + bruger.id, {
        method: "PATCH",
        prefer: "return=minimal",
        body: { adgangskode: nyKode, reset_kode_hash: null, reset_udloeber: null },
      });
      return json(200, { ok: true, besked: "Adgangskoden er ændret. Log ind med den nye." });
    }

    return json(400, { ok: false, fejl: "Ukendt handling" });
  } catch (e) {
    console.error("nulstil-kode:", e.message);
    const manglerKolonne = /email|reset_kode|42703|column/i.test(e.message);
    return json(500, {
      ok: false,
      fejl: manglerKolonne
        ? "Databasen mangler felterne til glemt adgangskode. Kør migrationen først."
        : "Noget gik galt. Prøv igen.",
    });
  }
};
