import type { VercelRequest, VercelResponse } from "@vercel/node";

// Rinnova l'access token di Strava (scade ogni 6 ore).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  const refresh = (req.body as { refresh_token?: string } | undefined)?.refresh_token;
  if (!refresh) {
    res.status(400).json({ error: "refresh_token mancante" });
    return;
  }
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const t = await r.json();
  if (!r.ok) {
    res.status(r.status).json({ error: "rinnovo non riuscito" });
    return;
  }
  res.status(200).json({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at });
}
