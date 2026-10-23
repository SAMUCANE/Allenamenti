import type { VercelRequest, VercelResponse } from "@vercel/node";

// Manda l'utente alla pagina di autorizzazione di Strava.
export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("Manca la variabile STRAVA_CLIENT_ID su Vercel.");
    return;
  }
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const base = `${proto}://${req.headers.host}`;
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${base}/api/strava/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read_all");
  res.redirect(302, url.toString());
}
