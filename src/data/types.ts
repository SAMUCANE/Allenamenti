export type Sport = "corsa" | "bici" | "nuoto" | "forza" | "mobilita";

export const SPORT_LABEL: Record<Sport, string> = {
  corsa: "Corsa",
  bici: "Bici",
  nuoto: "Nuoto",
  forza: "Forza",
  mobilita: "Mobilità",
};

export type Kind = "qualita" | "lunga" | "facile" | "test" | "gara" | "forza" | "tecnica" | "recupero";

export interface Program {
  id: string;
  name: string;
  sport: Sport | "multi";
  description: string;
  start: string; // YYYY-MM-DD
  end: string;
  color: string; // css var name, es. "--run"
  notes?: string[]; // regole o dettagli (es. schede esercizi)
  sheets?: Sheet[];
}

export interface Sheet {
  title: string;
  subtitle?: string;
  rows: { name: string; dose: string; why?: string }[];
}

export interface PlannedSession {
  id: string;
  programId: string;
  date: string; // YYYY-MM-DD
  sport: Sport;
  kind: Kind;
  title: string;
  detail: string;
  target?: string; // battiti o ritmi
  week?: number;
  km?: number;
}

export type Status = "fatto" | "parziale" | "saltato";

export interface LogEntry {
  id: string;
  date: string;
  plannedId?: string;
  sport: Sport;
  title: string;
  status: Status;
  minutes?: number;
  km?: number;
  avgHr?: number;
  rpe?: number; // 1-10
  note?: string;
  stravaId?: number;
  createdAt: number;
}

export interface StravaActivity {
  id: number;
  date: string; // locale YYYY-MM-DD
  start: string; // ISO locale
  name: string;
  sportType: string;
  sport: Sport | "altro";
  km: number;
  movingMin: number;
  avgHr?: number;
  maxHr?: number;
  elev?: number;
  avgKmh?: number;
}

export interface Goal {
  id: string;
  title: string;
  type: "gara" | "record" | "test" | "peso";
  date?: string;
  dateNote?: string;
  target: string;
  current?: string;
  detail?: string;
  done?: boolean;
  sport?: "corsa" | "bici" | "nuoto";
}

export interface WeightEntry {
  date: string;
  kg: number;
}

export interface Setting {
  key: string;
  value: unknown;
}
