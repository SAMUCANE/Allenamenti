import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db, uid } from "../data/db";
import { parse, short, today, weekday, withYear } from "../data/dates";
import type { Kind, LogEntry, PlannedSession, Sport } from "../data/types";
import { SPORT_LABEL } from "../data/types";
import { SessionCard } from "../components/SessionCard";
import { SPORT_COLOR, SportChip, useToast } from "../components/ui";

const PROG_COLOR: Record<string, string> = { "--run": "var(--run)", "--bike": "var(--bike)", "--swim": "var(--swim)", "--str": "var(--str)", "--mob": "var(--mob)" };

export function Programs() {
  const t = today();
  const data = useLiveQuery(async () => {
    const ORDER = ["run10k", "bike", "swim", "forza", "mobilita"];
    const programs = (await db.programs.toArray()).sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99));
    const sessions = await db.sessions.toArray();
    const logs = await db.logs.toArray();
    return { programs, sessions, logs };
  }, []);
  const [adding, setAdding] = useState(false);

  if (!data) return null;
  const doneIds = new Set(data.logs.filter((l) => l.status !== "saltato" && l.plannedId).map((l) => l.plannedId!));
  return (
    <>
      {data.programs.map((p) => {
        const ss = data.sessions.filter((s) => s.programId === p.id);
        const past = ss.filter((s) => s.date <= t);
        const done = ss.filter((s) => doneIds.has(s.id)).length;
        const next = ss.filter((s) => s.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0];
        const pct = ss.length ? (past.length / ss.length) * 100 : 0;
        return (
          <Link key={p.id} to={`/programmi/${p.id}`} className="card" style={{ textDecoration: "none", color: "inherit", borderLeft: `5px solid ${PROG_COLOR[p.color]}` }}>
            <div className="row between">
              <h3 className="num" style={{ fontSize: 23, margin: 0 }}>{p.name}</h3>
              {p.sport !== "multi" && <SportChip sport={p.sport} />}
            </div>
            <div className="small muted">{short(p.start)} → {withYear(p.end)} · {ss.length} sedute</div>
            <p className="small" style={{ margin: "6px 0 10px" }}>{p.description}</p>
            <div className="bar" style={{ ["--c" as string]: PROG_COLOR[p.color] }}><i style={{ width: `${pct}%` }} /></div>
            <div className="row between tiny muted" style={{ marginTop: 6 }}>
              <span>{done} fatte su {past.length} passate</span>
              {next && <span>Prossima: {weekday(next.date)} {short(next.date)}</span>}
            </div>
          </Link>
        );
      })}
      {adding ? <AddSession onDone={() => setAdding(false)} /> : <button className="btn" onClick={() => setAdding(true)}>+ Aggiungi una seduta extra</button>}
    </>
  );
}

function AddSession({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const programs = useLiveQuery(() => db.programs.toArray(), []);
  const [f, setF] = useState({ date: today(), sport: "corsa" as Sport, title: "", detail: "", target: "", programId: "run10k", kind: "facile" as Kind });
  async function save() {
    if (!f.title.trim()) { toast("Scrivi almeno un titolo"); return; }
    await db.sessions.put({ id: "x-" + uid(), programId: f.programId, date: f.date, sport: f.sport, kind: f.kind, title: f.title.trim(), detail: f.detail.trim(), target: f.target.trim() || undefined });
    toast("Seduta aggiunta");
    onDone();
  }
  return (
    <div className="card">
      <h3 className="num" style={{ fontSize: 21, margin: 0 }}>Nuova seduta</h3>
      <div className="form">
        <div className="grid">
          <label>Data<input id="ns-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label>Sport<select id="ns-sport" value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value as Sport })}>{(Object.keys(SPORT_LABEL) as Sport[]).map((s) => <option key={s} value={s}>{SPORT_LABEL[s]}</option>)}</select></label>
          <label>Tipo<select id="ns-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Kind })}>
            <option value="facile">Facile</option><option value="qualita">Qualità</option><option value="lunga">Lunga</option><option value="test">Test</option><option value="gara">Gara</option><option value="forza">Forza</option><option value="tecnica">Tecnica</option><option value="recupero">Recupero</option>
          </select></label>
        </div>
        <label>Programma<select id="ns-prog" value={f.programId} onChange={(e) => setF({ ...f, programId: e.target.value })}>{programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Titolo<input id="ns-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Es. Tentativo record San Fabiano" /></label>
        <label>Dettaglio<textarea id="ns-detail" value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></label>
        <label>Obiettivo (battiti, ritmi)<input id="ns-target" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></label>
        <div className="row"><button className="btn primary" onClick={save}>Aggiungi</button><button className="btn ghost" onClick={onDone}>Annulla</button></div>
      </div>
    </div>
  );
}

export function ProgramDetail() {
  const { id } = useParams();
  const t = today();
  const [openId, setOpenId] = useState<string | null>(null);
  const data = useLiveQuery(async () => {
    const p = await db.programs.get(id!);
    const ss = (await db.sessions.where("programId").equals(id!).toArray()).sort((a, b) => a.date.localeCompare(b.date));
    const logs = await db.logs.where("plannedId").anyOf(ss.map((s) => s.id)).toArray();
    return { p, ss, logs };
  }, [id]);
  if (!data) return null;
  if (!data.p) return <div className="card empty">Programma non trovato. <Link to="/programmi">Torna ai programmi</Link></div>;
  const { p, ss } = data;
  const byPlanned = new Map(data.logs.map((l) => [l.plannedId!, l]));

  // raggruppa per settimana del programma se c'è, altrimenti per mese
  const groups = new Map<string, PlannedSession[]>();
  for (const s of ss) {
    const k = s.week ? `Settimana ${s.week}` : parse(s.date).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  }

  return (
    <>
      <Link to="/programmi" className="small">← Programmi</Link>
      <div className="card" style={{ borderLeft: `5px solid ${PROG_COLOR[p.color]}` }}>
        <h3 className="num" style={{ fontSize: 26, margin: 0 }}>{p.name}</h3>
        <div className="small muted">{withYear(p.start)} → {withYear(p.end)}</div>
        <p style={{ margin: "8px 0 0" }}>{p.description}</p>
        {p.notes && <ul className="small" style={{ margin: "10px 0 0", paddingLeft: 18 }}>{p.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
        {p.sheets?.map((sh) => (
          <div key={sh.title} className="sheet">
            <h4>{sh.title}</h4>
            {sh.subtitle && <div className="small muted">{sh.subtitle}</div>}
            {sh.rows.map((r) => (
              <div key={r.name} className="ex"><span>{r.name}</span><span className="num" style={{ fontSize: 16 }}>{r.dose}</span>{r.why && <span className="why">{r.why}</span>}</div>
            ))}
          </div>
        ))}
      </div>

      {[...groups.entries()].map(([k, list]) => {
        const current = list.some((s) => s.date >= t) && list.some((s) => s.date <= t);
        return (
          <div key={k} className="card" style={current ? { outline: `2px solid ${PROG_COLOR[p.color]}` } : undefined}>
            <div className="row between"><b className="num" style={{ fontSize: 18, textTransform: "capitalize" }}>{k}</b>{current && <span className="pill">In corso</span>}</div>
            {list.map((s) => {
              const log: LogEntry | undefined = byPlanned.get(s.id);
              return (
                <div key={s.id}>
                  <button className="mini" onClick={() => setOpenId(openId === s.id ? null : s.id)} aria-expanded={openId === s.id}>
                    <span className="dot" style={{ ["--c" as string]: SPORT_COLOR[s.sport] }} />
                    <span className="small muted num" style={{ width: 62, fontSize: 15 }}>{weekday(s.date)} {short(s.date)}</span>
                    <span className="s">{s.title}</span>
                    {log?.status === "fatto" && <span style={{ color: "var(--ok)" }}>✓</span>}
                    {log?.status === "parziale" && <span style={{ color: "var(--warn)" }}>◐</span>}
                    {log?.status === "saltato" && <span style={{ color: "var(--bad)" }}>✕</span>}
                  </button>
                  {openId === s.id && <div style={{ margin: "6px 0 10px" }}><SessionCard session={s} log={log} /></div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
