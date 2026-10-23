import type { VercelRequest, VercelResponse } from "@vercel/node";

// Strava rimanda qui con ?code=...: lo scambiamo con i token (serve il client secret, che resta sul server)
// e li passiamo all'app nel frammento dell'URL, che non viene inviato a nessun server.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.redirect(302, "/#/impostazioni?errore=strava");
    return;
  }
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) {
    res.redirect(302, "/#/impostazioni?errore=strava");
    return;
  }
  const t = await r.json();
  const allowed = process.env.STRAVA_ATHLETE_ID;
  if (allowed && String(t.athlete?.id) !== allowed) {
    res.status(403).send("Questo account Strava non è autorizzato a usare l'app.");
    return;
  }
  const payload = {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    athlete: [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" "),
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  res.redirect(302, `/#/impostazioni?strava=${b64}`);
}
