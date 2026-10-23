// Date sempre come stringhe locali YYYY-MM-DD, così non ci sono sorprese con il fuso orario.
export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function today(): string {
  return iso(new Date());
}

/** Lunedì della settimana che contiene la data. */
export function mondayOf(s: string): string {
  const d = parse(s);
  const wd = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - wd);
  return iso(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

const WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const WD_LONG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MO = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export function short(s: string): string {
  const d = parse(s);
  return `${d.getDate()} ${MO[d.getMonth()]}`;
}

export function weekday(s: string): string {
  return WD[parse(s).getDay()];
}

export function long(s: string): string {
  const d = parse(s);
  return `${WD_LONG[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`;
}

export function withYear(s: string): string {
  const d = parse(s);
  return `${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear()}`;
}
