// Nummerplade-scanning via Claude Vision — kører server-side så API-nøglen ikke eksponeres i klientkoden
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "API-nøgle ikke konfigureret" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ugyldigt JSON" }) };
  }

  const { image, mode } = body;
  if (!image) {
    return { statusCode: 400, body: JSON.stringify({ error: "Mangler billede" }) };
  }

  const b64 = image.replace(/^data:image\/\w+;base64,/, "");

  const prompt = mode === "blød"
    ? "Look carefully for any Danish motorcycle license plate in this photo, even if blurry or at an angle. Danish plates: 2 letters + 5 digits, white background, red border. Give your best guess at the characters. Reply with ONLY what you can read (letters and digits). If truly nothing visible: INGEN"
    : "Find the Danish motorcycle license plate in this photo. Danish MC plates have a white/grey background, red border, blue EU strip with DK on the left. Format: 2 capital letters on top, 5 digits on bottom. Examples: EH49704, AX59119, EH50188, DZ46431, DD70407. Reply with ONLY the 7 characters, no spaces. If no plate found: INGEN";

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 30,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text().catch(() => "");
      return { statusCode: resp.status, body: JSON.stringify({ error: "Claude API fejl: " + errTxt.substring(0, 200) }) };
    }

    const data = await resp.json();
    const tekst = data.content?.[0]?.text?.trim() || "";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tekst }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
