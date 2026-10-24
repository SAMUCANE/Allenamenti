import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db, uid } from "../data/db";
import { parse, short, today, weekday, withYear } from "../data/dates";
import type { Kind, LogEntry, PlannedSession, Program, Sport } from "../data/types";
import { SPORT_LABEL } from "../data/types";
import { SessionCard } from "../components/SessionCard";
import { SPORT_COLOR, useToast } from "../components/ui";

const PROG_COLOR: Record<string, string> = { "--run": "var(--run)", "--bike": "var(--bike)", "--swim": "var(--swim)", "--str": "var(--str)", "--mob": "var(--mob)" };
const EMOJI: Record<string, string> = { corsa: "🏃", bici: "🚴", nuoto: "🏊", forza: "🏋️", mobilita: "🧘", multi: "⭐" };
const CARD_CLASS: Record<string, string> = { "--run": "p-run", "--bike": "p-bike", "--swim": "p-swim", "--str": "p-force", "--mob": "p-rest" };

type Filter = "tutti" | Sport;

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
  const [filter, setFilter] = useState<Filter>("tutti");

  const info = useMemo(() => {
    if (!data) return null;
    const doneIds = new Set(data.logs.filter((l) => l.status !== "saltato" && l.plannedId).map((l) => l.plannedId!));
    const by: Record<string, { done: number; total: number; past: number; next?: PlannedSession }> = {};
    for (const p of data.programs) {
      const ss = data.sessions.filter((s) => s.programId === p.id);
      const past = ss.filter((s) => s.date <= t);
      const done = ss.filter((s) => doneIds.has(s.id)).length;
      const next = ss.filter((s) => s.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0];
      by[p.id] = { done, total: ss.length, past: past.length, next };
    }
    return by;
  }, [data, t]);

  if (!data || !info) return null;

  const visible = filter === "tutti" ? data.programs : data.programs.filter((p) => p.sport === filter);
  const featured = visible[0];
  const rest = visible.slice(1);

  return (
    <>
      {/* Filter chips */}
      <div className="filters" role="tablist">
        {(["tutti", "corsa", "bici", "nuoto", "forza"] as Filter[]).map((f) => (
          <button key={f} className={`chip-f${filter === f ? " on" : ""}`} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {f === "tutti" ? "Tutti" : SPORT_LABEL[f as Sport]}
          </button>
        ))}
      </div>

      {/* Featured program */}
      {featured && <FeaturedCard p={featured} meta={info[featured.id]} />}

      {/* Other programs grid */}
      {rest.length > 0 && (
        <>
          <h2 className="sec">Altri programmi</h2>
          <div className="prog-grid">
            {rest.map((p) => <SmallProgramCard key={p.id} p={p} meta={info[p.id]} />)}
          </div>
        </>
      )}

      {visible.length === 0 && <div className="card empty">Nessun programma per questo filtro.</div>}

      {/* Add session */}
      {adding ? (
        <AddSession onDone={() => setAdding(false)} />
      ) : (
        <button className="add-row" onClick={() => setAdding(true)}>
          <span className="ico" aria-hidden="true">➕</span>
          <div style={{ flex: 1 }}>
            <div className="ar-t">Aggiungi una seduta extra</div>
            <div className="ar-s">Si attacca al programma che scegli</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
    </>
  );
}

function FeaturedCard({ p, meta }: { p: Program; meta: { done: number; total: number; past: number; next?: PlannedSession } }) {
  const C = 188.496; // 2π·30
  const pct = meta.total ? Math.min(meta.past / meta.total, 1) : 0;
  const offset = C * (1 - pct);
  return (
    <Link to={`/programmi/${p.id}`} className="prog-featured" style={{ background: PROG_COLOR[p.color] }}>
      <div className="ft">
        <span className="fk">In corso · priorità</span>
        <span className="fe" aria-hidden="true">{EMOJI[p.sport]}</span>
      </div>
      <div className="fn">{p.name}</div>
      <div className="fs">{p.description.length > 90 ? p.description.slice(0, 88) + "…" : p.description}</div>
      <div className="frow">
        <div className="ring" aria-label={`Progresso ${meta.past} su ${meta.total}`}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="8"/>
            <circle cx="36" cy="36" r="30" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}/>
          </svg>
          <div className="n">{meta.past}<small>/{meta.total}</small></div>
        </div>
        <div className="fnext">
          <div className="k">{meta.next ? "Prossima seduta" : "Programma completato"}</div>
          {meta.next && <>
            <div className="t">{meta.next.title}</div>
            <div className="s">{weekday(meta.next.date)} {short(meta.next.date)}{meta.next.detail ? ` · ${meta.next.detail.replace(/\s+·.*$/, "").slice(0, 40)}` : ""}</div>
          </>}
        </div>
      </div>
    </Link>
  );
}

function SmallProgramCard({ p, meta }: { p: Program; meta: { done: number; total: number; past: number; next?: PlannedSession } }) {
  const pct = meta.total ? Math.round((meta.past / meta.total) * 100) : 0;
  const cls = CARD_CLASS[p.color] ?? "p-rest";
  return (
    <Link to={`/programmi/${p.id}`} className={`prog-card ${cls}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="emoji" aria-hidden="true">{EMOJI[p.sport]}</span>
        {meta.next && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", opacity: 0.85, textTransform: "uppercase" }}>{weekday(meta.next.date)} {short(meta.next.date)}</span>}
      </div>
      <div>
        <div className="ct">{p.name}</div>
        <div className="cs">{p.description.replace(/\s+/g, " ").slice(0, 44)}{p.description.length > 44 ? "…" : ""}</div>
        <div className="cmini"><span style={{ width: `${pct}%` }} /></div>
        <div className="cfoot"><span>{meta.past} / {meta.total} sedute</span><span>{pct}%</span></div>
      </div>
    </Link>
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
