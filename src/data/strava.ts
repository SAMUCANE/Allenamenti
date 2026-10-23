import { db, getSetting, setSetting, uid } from "./db";
import type { Sport, StravaActivity } from "./types";

export interface StravaAuth {
  access_token: string;
  refresh_token: string;
  expires_at: number; // secondi epoch
  athlete?: string;
}

const KEY = "strava";

/** Dopo il login Strava, il server rimanda a #/impostazioni?strava=<base64>. */
export async function captureAuthFromUrl(): Promise<boolean> {
  const h = window.location.hash;
  const i = h.indexOf("strava=");
  if (i < 0) return false;
  const raw = decodeURIComponent(h.slice(i + 7).split("&")[0]);
  try {
    const json = JSON.parse(atob(raw.replace(/-/g, "+").replace(/_/g, "/")));
    await setSetting(KEY, json as StravaAuth);
    window.location.hash = "#/impostazioni";
    return true;
  } catch {
    return false;
  }
}

export async function getAuth(): Promise<StravaAuth | undefined> {
  return getSetting<StravaAuth>(KEY);
}

export async function disconnect(): Promise<void> {
  await db.settings.delete(KEY);
}

export function connect(): void {
  window.location.href = "/api/strava/login";
}

async function validToken(): Promise<string> {
  const auth = await getAuth();
  if (!auth) throw new Error("Strava non è collegato.");
  if (auth.expires_at * 1000 > Date.now() + 120_000) return auth.access_token;
  const r = await fetch("/api/strava/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: auth.refresh_token }),
  });
  if (!r.ok) throw new Error("Il collegamento con Strava è scaduto: ricollegalo dalle impostazioni.");
  const t = await r.json();
  const next: StravaAuth = { ...auth, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at };
  await setSetting(KEY, next);
  return next.access_token;
}

export function mapSport(t: string): Sport | "altro" {
  if (/Run/i.test(t)) return "corsa";
  if (/Ride|Cycl/i.test(t)) return "bici";
  if (/Swim/i.test(t)) return "nuoto";
  if (/Weight|Workout|Crossfit|HIIT/i.test(t)) return "forza";
  if (/Yoga|Pilates/i.test(t)) return "mobilita";
  return "altro";
}

// Campi dell'API Strava v3 /athlete/activities che usiamo.
interface RawActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  average_speed?: number;
}

function toActivity(a: RawActivity): StravaActivity {
  const st = a.sport_type || a.type || "";
  return {
    id: a.id,
    name: a.name,
    sportType: st,
    sport: mapSport(st),
    start: a.start_date_local.replace("Z", ""),
    date: a.start_date_local.slice(0, 10),
    km: Math.round(a.distance / 10) / 100,
    movingMin: Math.round(a.moving_time / 60),
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
    elev: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : undefined,
    avgKmh: a.average_speed ? Math.round(a.average_speed * 36) / 10 : undefined,
  };
}

/** Scarica le attività nuove e le abbina alle sedute pianificate dello stesso giorno e sport. */
export async function sync(): Promise<{ added: number; matched: number }> {
  const token = await validToken();
  const last = await getSetting<number>("stravaLastSync");
  // la prima volta parte dal 1° ottobre 2026; poi rilegge gli ultimi 3 giorni per prendere le modifiche
  const after = last ? last - 3 * 86400 : Math.floor(new Date(2026, 9, 1).getTime() / 1000);
  const all: StravaActivity[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`/api/strava/activities?after=${after}&page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`Strava ha risposto con un errore (${r.status}).`);
    const batch: RawActivity[] = await r.json();
    all.push(...batch.map(toActivity));
    if (batch.length < 100) break;
  }
  const existing = new Set((await db.strava.toArray()).map((a) => a.id));
  await db.strava.bulkPut(all);
  const added = all.filter((a) => !existing.has(a.id)).length;
  const matched = await autoMatch(all);
  await setSetting("stravaLastSync", Math.floor(Date.now() / 1000));
  return { added, matched };
}

async function autoMatch(acts: StravaActivity[]): Promise<number> {
  let n = 0;
  for (const a of acts) {
    if (a.sport === "altro") continue;
    const linked = await db.logs.where("stravaId").equals(a.id).first();
    if (linked) continue;
    const planned = (await db.sessions.where("date").equals(a.date).toArray()).filter((s) => s.sport === a.sport);
    for (const p of planned) {
      const log = await db.logs.where("plannedId").equals(p.id).first();
      if (log && log.stravaId) continue;
      if (log) {
        await db.logs.update(log.id, { stravaId: a.id, km: log.km ?? a.km, minutes: log.minutes ?? a.movingMin, avgHr: log.avgHr ?? a.avgHr });
      } else {
        await db.logs.put({
          id: uid(), date: a.date, plannedId: p.id, sport: p.sport, title: p.title, status: "fatto",
          minutes: a.movingMin, km: a.km || undefined, avgHr: a.avgHr, stravaId: a.id, createdAt: Date.now(),
        });
      }
      n++;
      break;
    }
  }
  return n;
}
