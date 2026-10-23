import type { VercelRequest, VercelResponse } from "@vercel/node";

// Inoltra la richiesta delle attività a Strava con il token dell'utente.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "token mancante" });
    return;
  }
  const url = new URL("https://www.strava.com/api/v3/athlete/activities");
  for (const k of ["after", "before", "page", "per_page"]) {
    const v = req.query[k];
    if (typeof v === "string" && /^\d+$/.test(v)) url.searchParams.set(k, v);
  }
  const r = await fetch(url, { headers: { Authorization: auth } });
  const body = await r.text();
  res.status(r.status).setHeader("Content-Type", "application/json").send(body);
}
