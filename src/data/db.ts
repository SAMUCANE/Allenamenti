import Dexie, { type Table } from "dexie";
import type { Goal, LogEntry, PlannedSession, Program, Setting, StravaActivity, WeightEntry } from "./types";
import { GOALS, PROGRAMS, WEIGHTS, buildSessions } from "./seed";

class TrainingDB extends Dexie {
  programs!: Table<Program, string>;
  sessions!: Table<PlannedSession, string>;
  logs!: Table<LogEntry, string>;
  strava!: Table<StravaActivity, number>;
  goals!: Table<Goal, string>;
  weights!: Table<WeightEntry, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super("allenamenti");
    this.version(1).stores({
      programs: "id",
      sessions: "id, date, programId, sport",
      logs: "id, date, plannedId, stravaId",
      strava: "id, date",
      goals: "id, type",
      weights: "date",
      settings: "key",
    });
  }
}

export const db = new TrainingDB();

// Aumenta questo numero quando cambiano i programmi precaricati:
// i programmi e le sessioni vengono riscritti, il registro e Strava restano.
const SEED_VERSION = 1;

export async function ensureSeed(): Promise<void> {
  const s = await db.settings.get("seedVersion");
  const current = (s?.value as number) ?? 0;
  if (current >= SEED_VERSION) return;
  await db.transaction("rw", [db.programs, db.sessions, db.goals, db.weights, db.settings], async () => {
    await db.programs.clear();
    await db.sessions.filter((x) => !x.id.startsWith("x-")).delete();
    await db.programs.bulkPut(PROGRAMS);
    await db.sessions.bulkPut(buildSessions());
    if (current === 0) {
      await db.goals.bulkPut(GOALS);
      await db.weights.bulkPut(WEIGHTS);
    }
    await db.settings.put({ key: "seedVersion", value: SEED_VERSION });
  });
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------- Backup ----------
export async function exportAll(): Promise<string> {
  const data = {
    app: "allenamenti",
    exportedAt: new Date().toISOString(),
    logs: await db.logs.toArray(),
    strava: await db.strava.toArray(),
    goals: await db.goals.toArray(),
    weights: await db.weights.toArray(),
    sessions: await db.sessions.toArray(),
    programs: await db.programs.toArray(),
  };
  return JSON.stringify(data, null, 1);
}

export async function importAll(json: string): Promise<void> {
  const d = JSON.parse(json);
  if (d.app !== "allenamenti") throw new Error("Il file non è un backup di questa app.");
  await db.transaction("rw", [db.logs, db.strava, db.goals, db.weights, db.sessions, db.programs], async () => {
    if (d.programs?.length) { await db.programs.clear(); await db.programs.bulkPut(d.programs); }
    if (d.sessions?.length) { await db.sessions.clear(); await db.sessions.bulkPut(d.sessions); }
    await db.logs.clear(); await db.logs.bulkPut(d.logs ?? []);
    await db.strava.clear(); await db.strava.bulkPut(d.strava ?? []);
    await db.goals.clear(); await db.goals.bulkPut(d.goals ?? []);
    await db.weights.clear(); await db.weights.bulkPut(d.weights ?? []);
  });
}
