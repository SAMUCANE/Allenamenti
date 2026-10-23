import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { LogEntry, PlannedSession, StravaActivity } from "./types";

export interface DayItem {
  session: PlannedSession;
  log?: LogEntry;
  strava?: StravaActivity;
}

const ORDER = ["corsa", "bici", "nuoto", "forza", "mobilita"];

/** Sedute pianificate tra due date (incluse), con il loro registro e l'attività Strava collegata. */
export function useRange(from: string, to: string) {
  return useLiveQuery(async () => {
    const sessions = await db.sessions.where("date").between(from, to, true, true).toArray();
    const logs = await db.logs.where("date").between(from, to, true, true).toArray();
    const strava = await db.strava.where("date").between(from, to, true, true).toArray();
    const byPlanned = new Map(logs.filter((l) => l.plannedId).map((l) => [l.plannedId!, l]));
    const sById = new Map(strava.map((a) => [a.id, a]));
    const items: DayItem[] = sessions
      .sort((a, b) => a.date.localeCompare(b.date) || ORDER.indexOf(a.sport) - ORDER.indexOf(b.sport))
      .map((s) => {
        const log = byPlanned.get(s.id);
        return { session: s, log, strava: log?.stravaId ? sById.get(log.stravaId) : undefined };
      });
    const linked = new Set(logs.map((l) => l.stravaId).filter(Boolean));
    const freeStrava = strava.filter((a) => !linked.has(a.id));
    const freeLogs = logs.filter((l) => !l.plannedId);
    return { items, freeStrava, freeLogs, logs, strava };
  }, [from, to]);
}
