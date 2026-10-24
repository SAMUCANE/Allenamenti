import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { db, uid } from "../data/db";
import { addDays, short, today, weekday } from "../data/dates";
import { getAuth, sync } from "../data/strava";
import type { Sport, Status } from "../data/types";
import { SPORT_LABEL } from "../data/types";
import { Icon, fmtKm, fmtMin, useToast } from "../components/ui";

const EMOJI: Record<string, string> = { corsa: "🏃", bici: "🚴", nuoto: "🏊", forza: "🏋️", mobilita: "🧘", altro: "⭐" };
const ICO_CLASS: Record<string, string> = { corsa: "ico-run", bici: "ico-bike", nuoto: "ico-swim", forza: "ico-force", mobilita: "ico-mob", altro: "ico-mob" };

interface Row {
  key: string;
  date: string;
  sport: Sport | "altro";
  title: string;
  meta: string;
  status?: Status;
  source: "registro" | "strava";
  note?: string;
  logId?: string;
  km?: number;
  minutes?: number;
}

type Filter = "tutti" | Sport | "strava";

export function Log() {
  const toast = useToast();
  const [days, setDays] = useState(45);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("tutti");
  const from = addDays(today(), -days);
  const auth = useLiveQuery(() => getAuth(), []);
  const rows = useLiveQuery(async () => {
    const logs = await db.logs.where("date").aboveOrEqual(from).toArray();
    const strava = await db.strava.where("date").aboveOrEqual(from).toArray();
    const sById = new Map(strava.map((a) => [a.id, a]));
    const linked = new Set(logs.map((l) => l.stravaId).filter(Boolean));
    const out: Row[] = logs.map((l) => {
      const a = l.stravaId ? sById.get(l.stravaId) : undefined;
      return {
        key: l.id, date: l.date, sport: l.sport, title: l.title, status: l.status, source: a ? "strava" : "registro", note: l.note, logId: l.id,
        km: l.km ?? a?.km, minutes: l.minutes ?? a?.movingMin,
        meta: [fmtKm(l.km ?? a?.km), fmtMin(l.minutes ?? a?.movingMin), (l.avgHr ?? a?.avgHr) ? `${l.avgHr ?? a?.avgHr} bpm` : "", l.rpe ? `fatica ${l.rpe}/10` : ""].filter(Boolean).join(" · "),
      };
    });
    for (const a of strava) {
      if (linked.has(a.id)) continue;
      out.push({ key: "s" + a.id, date: a.date, sport: a.sport, title: a.name, source: "strava", km: a.km, minutes: a.movingMin, meta: [fmtKm(a.km), fmtMin(a.movingMin), a.avgHr ? `${a.avgHr} bpm` : "", a.elev ? `+${a.elev} m` : ""].filter(Boolean).join(" · ") });
    }
    return out.sort((x, y) => y.date.localeCompare(x.date));
  }, [from]);

  // Monthly KPIs computed over current calendar month
  const monthKpis = useMemo(() => {
    const t = today();
    const m = t.slice(0, 7);
    const list = (rows ?? []).filter((r) => r.date.startsWith(m) && r.status !== "saltato");
    const sedute = list.filter((r) => r.source === "registro" || r.sport !== "altro").length;
    const km = list.filter((r) => r.sport === "corsa" || r.sport === "bici").reduce((s, r) => s + (r.km ?? 0), 0);
    const minTot = list.reduce((s, r) => s + (r.minutes ?? 0), 0);
    const hh = Math.floor(minTot / 60);
    return { sedute, km, hh };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === "tutti") return rows;
    if (filter === "strava") return rows.filter((r) => r.source === "strava");
    return rows.filter((r) => r.sport === filter);
  }, [rows, filter]);

  // Group by date
  const groups = useMemo(() => {
    const g = new Map<string, Row[]>();
    for (const r of filtered) {
      if (!g.has(r.date)) g.set(r.date, []);
      g.get(r.date)!.push(r);
    }
    return [...g.entries()];
  }, [filtered]);

  async function doSync() {
    setBusy(true);
    try {
      const r = await sync();
      toast(`Strava: ${r.added} nuove attività, ${r.matched} abbinate al programma`);
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    await db.logs.delete(id);
    toast("Voce eliminata");
  }

  const t = today();
  const nowLabel = new Date(t.slice(0, 10)).toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <>
      {/* Monthly summary strip */}
      <div className="log-strip">
        <div className="log-kpi"><div className="n">{monthKpis.sedute}</div><div className="l">Sedute</div></div>
        <div className="log-kpi"><div className="n">{monthKpis.km.toLocaleString("it-IT", { maximumFractionDigits: 1 })}<small>km</small></div><div className="l">Corsa + bici</div></div>
        <div className="log-kpi"><div className="n">{monthKpis.hh}<small>h</small></div><div className="l">{nowLabel}</div></div>
      </div>

      {/* Actions row */}
      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn" onClick={() => setAdding(!adding)} aria-expanded={adding}><span className="row" style={{ gap: 6 }}><Icon name="plus" size={16} />Allenamento</span></button>
        {auth ? (
          <button className="btn" onClick={doSync} disabled={busy}><span className="row" style={{ gap: 6 }}><Icon name="sync" size={16} />{busy ? "Sincronizzo…" : "Strava"}</span></button>
        ) : (
          <span className="small muted">Collega Strava dalle ⚙︎ per importare le attività.</span>
        )}
      </div>
      {adding && <AddLog onDone={() => setAdding(false)} />}

      {/* Filter chips */}
      <div className="filters" role="tablist">
        {(["tutti", "corsa", "bici", "nuoto", "forza"] as Filter[]).map((f) => (
          <button key={f} className={`chip-f${filter === f ? " on" : ""}`} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {f === "tutti" ? "Tutti" : `${EMOJI[f]} ${SPORT_LABEL[f as Sport]}`}
          </button>
        ))}
        <button className={`chip-f${filter === "strava" ? " on" : ""}`} role="tab" aria-selected={filter === "strava"} onClick={() => setFilter("strava")}><span className="d" />Strava</button>
      </div>

      {/* Timeline */}
      {groups.length === 0 && <div className="card empty">Ancora niente qui. Segna le sedute dalla schermata Oggi o sincronizza Strava.</div>}
      {groups.map(([date, list]) => (
        <div key={date} className="log-group">
          <div className="log-group-h">
            <span className="d">{date === t ? "Oggi · " : ""}{weekday(date)} {short(date)}</span>
            <span className="t">{list.length} {list.length === 1 ? "attività" : "attività"}</span>
          </div>
          {list.map((r) => (
            <div key={r.key} className="log-row">
              <div className={`ico ${ICO_CLASS[r.sport] ?? "ico-mob"}`} aria-hidden="true">{EMOJI[r.sport] ?? "⭐"}</div>
              <div style={{ minWidth: 0 }}>
                <div className="lt">{r.title}{r.source === "strava" && <span className="strava-badge">STRAVA</span>}</div>
                <div className="ls">{r.meta || (r.source === "strava" ? "Strava" : "")}</div>
                {r.note && <div className="small" style={{ marginTop: 2, fontStyle: "italic" }}>“{r.note}”</div>}
              </div>
              <div className="time">
                {r.status === "fatto" && <span className="pill ok">✓</span>}
                {r.status === "parziale" && <span className="pill warn">◐</span>}
                {r.status === "saltato" && <span className="pill bad">✕</span>}
                {r.logId && <div><button className="btn ghost tiny" style={{ minHeight: 0, padding: "2px 6px", marginTop: 4 }} onClick={() => remove(r.logId!)} aria-label={`Elimina ${r.title}`}>×</button></div>}
              </div>
            </div>
          ))}
        </div>
      ))}

      <button className="btn ghost" onClick={() => setDays(days + 60)}>Mostra più vecchi</button>
      <p className="tiny muted" style={{ textAlign: "center", margin: 0 }}>Ultime {days} giornate · {rows?.length ?? 0} totali</p>
    </>
  );
}

function AddLog({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ date: today(), sport: "corsa" as Sport, title: "", minutes: "", km: "", avgHr: "", rpe: 5, note: "" });
  async function save() {
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));
    await db.logs.put({
      id: uid(), date: f.date, sport: f.sport, title: f.title.trim() || SPORT_LABEL[f.sport], status: "fatto",
      minutes: num(f.minutes), km: num(f.km), avgHr: num(f.avgHr), rpe: f.rpe, note: f.note.trim() || undefined, createdAt: Date.now(),
    });
    toast("Allenamento aggiunto");
    onDone();
  }
  return (
    <div className="card">
      <div className="form" style={{ marginTop: 0 }}>
        <div className="grid">
          <label>Data<input id="al-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label>Sport<select id="al-sport" value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value as Sport })}>{(Object.keys(SPORT_LABEL) as Sport[]).map((s) => <option key={s} value={s}>{SPORT_LABEL[s]}</option>)}</select></label>
          <label>Minuti<input id="al-min" inputMode="numeric" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></label>
        </div>
        <label>Titolo<input id="al-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Es. Tapis roulant progressivo" /></label>
        <div className="grid">
          <label>Km<input id="al-km" inputMode="decimal" value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} /></label>
          <label>Battiti medi<input id="al-hr" inputMode="numeric" value={f.avgHr} onChange={(e) => setF({ ...f, avgHr: e.target.value })} /></label>
          <label>Fatica {f.rpe}/10<input id="al-rpe" type="range" min={1} max={10} value={f.rpe} onChange={(e) => setF({ ...f, rpe: Number(e.target.value) })} /></label>
        </div>
        <label>Note<textarea id="al-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <div className="row"><button className="btn primary" onClick={save}>Salva</button><button className="btn ghost" onClick={onDone}>Annulla</button></div>
      </div>
    </div>
  );
}

