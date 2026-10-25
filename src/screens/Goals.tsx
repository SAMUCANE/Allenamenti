import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db, uid } from "../data/db";
import { daysBetween, parse, today, withYear } from "../data/dates";
import type { Goal } from "../data/types";
import { useToast } from "../components/ui";

const SPORT_FROM_TITLE = (t: string, detail?: string): "run" | "bike" | "swim" => {
  const s = `${t} ${detail ?? ""}`.toLowerCase();
  if (/nuot/.test(s)) return "swim";
  if (/bici|sella|ronda|km bici|dislivell|cronoscal/.test(s)) return "bike";
  return "run";
};
const EMOJI_FROM: Record<string, string> = { run: "🏃", bike: "🚴", swim: "🏊" };
const CARD_CLASS: Record<string, string> = { run: "r-run", bike: "r-bike", swim: "r-swim" };

export function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  if (!goals) return null;

  const t = today();
  const future = goals.filter((g) => g.date && g.date >= t && !g.done).sort((a, b) => a.date!.localeCompare(b.date!));
  const nextRace = future.find((g) => g.type === "gara");
  const otherRaces = future.filter((g) => g.type === "gara" && g.id !== nextRace?.id);
  const records = goals.filter((g) => g.type === "record");
  const tests = goals.filter((g) => g.type === "test").sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));

  return (
    <>
      {nextRace && <RaceHero g={nextRace} onEdit={() => setEditId(editId === nextRace.id ? null : nextRace.id)} />}
      {editId === nextRace?.id && nextRace && <GoalEditor g={nextRace} onClose={() => setEditId(null)} />}

      {records.length > 0 && (
        <>
          <h2 className="sec">Record personali</h2>
          <div className="rec-grid">
            {records.slice(0, 4).map((g) => <RecordCard key={g.id} g={g} onClick={() => setEditId(editId === g.id ? null : g.id)} />)}
          </div>
          {records.length > 4 && <div className="small muted" style={{ textAlign: "center" }}>+{records.length - 4} altri</div>}
          {records.map((g) => editId === g.id && <GoalEditor key={g.id} g={g} onClose={() => setEditId(null)} />)}
        </>
      )}

      <Weight />

      {tests.length > 0 && (
        <>
          <h2 className="sec">Prossimi test</h2>
          {tests.map((g) => <TestRow key={g.id} g={g} onClick={() => setEditId(editId === g.id ? null : g.id)} />)}
          {tests.map((g) => editId === g.id && <GoalEditor key={g.id} g={g} onClose={() => setEditId(null)} />)}
        </>
      )}

      {otherRaces.length > 0 && (
        <>
          <h2 className="sec">Altre gare</h2>
          {otherRaces.map((g) => <TestRow key={g.id} g={g} onClick={() => setEditId(editId === g.id ? null : g.id)} />)}
          {otherRaces.map((g) => editId === g.id && <GoalEditor key={g.id} g={g} onClose={() => setEditId(null)} />)}
        </>
      )}

      {adding ? <AddGoal onDone={() => setAdding(false)} /> : (
        <button className="add-row" onClick={() => setAdding(true)}>
          <span className="ico" aria-hidden="true">🎯</span>
          <div style={{ flex: 1 }}><div className="ar-t">Nuovo obiettivo</div><div className="ar-s">Gara, record o test</div></div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
    </>
  );
}

function RaceHero({ g, onEdit }: { g: Goal; onEdit: () => void }) {
  const [cd, setCd] = useState(() => calcCountdown(g.date!));
  useEffect(() => {
    if (cd.d > 0) {
      const id = window.setInterval(() => setCd(calcCountdown(g.date!)), 60000);
      return () => window.clearInterval(id);
    }
  }, [g.date, cd.d]);
  return (
    <div className="race-hero">
      <div className="rt">
        <span className="rk">Prossima gara</span>
        <span className="flag" aria-hidden="true">🏁</span>
      </div>
      <div className="rn">{g.title}</div>
      <div className="rw">{withYear(g.date!)}{g.detail ? ` · ${g.detail}` : ""}</div>
      <div className="cd-row" aria-label={`Fra ${cd.d} giorni`}>
        <div className="cd"><div className="n">{cd.d}</div><div className="l">Giorni</div></div>
        <div className="cd"><div className="n">{cd.h}</div><div className="l">Ore</div></div>
        <div className="cd"><div className="n">{cd.m}</div><div className="l">Min</div></div>
        <div className="cd"><div className="n">{cd.s}</div><div className="l">Sec</div></div>
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span className="pill-l">Obiettivo: {g.target}</span>
        <button className="sc-btn" onClick={onEdit}>Aggiorna</button>
      </div>
    </div>
  );
}

function calcCountdown(date: string) {
  const t = parse(date).getTime();
  const now = Date.now();
  const diff = Math.max(0, t - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h: String(h).padStart(2, "0"), m: String(m).padStart(2, "0"), s: String(s).padStart(2, "0") };
}

function RecordCard({ g, onClick }: { g: Goal; onClick: () => void }) {
  const kind = g.sport ? (({ corsa: "run", bici: "bike", nuoto: "swim" } as const)[g.sport]) : SPORT_FROM_TITLE(g.title, g.detail);
  const name = g.title.replace(/^Salita\s+/i, "").trim();
  const nameShort = name.length > 18 ? name.slice(0, 17) + "…" : name;
  const curShort = (g.current ?? "").replace(/\s*\(.*\)\s*/, "").split(",")[0] || "—";
  const tgtShort = g.target.split(/\s*·\s*/)[0];
  return (
    <button className={`rec-card ${CARD_CLASS[kind]}`} onClick={onClick} style={{ textAlign: "left", border: 0, cursor: "pointer", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <span className="emoji" aria-hidden="true">{EMOJI_FROM[kind]}</span>
        <span className="ct" style={{ textAlign: "right" }}>{nameShort}</span>
      </div>
      <div>
        <div className="cv">{curShort}</div>
        <div className="cs">Obiettivo: {tgtShort}</div>
      </div>
    </button>
  );
}

function TestRow({ g, onClick }: { g: Goal; onClick: () => void }) {
  const t = today();
  const dd = g.date ? daysBetween(t, g.date) : null;
  const past = dd !== null && dd < 0;
  return (
    <button className="log-row" onClick={onClick} style={{ textAlign: "left", width: "100%", border: 0, cursor: "pointer" }}>
      <div className={`ico ${g.type === "gara" ? "ico-pink" : "ico-orange"}`} aria-hidden="true">{g.type === "gara" ? "🏁" : "⚡"}</div>
      <div style={{ minWidth: 0 }}>
        <div className="lt">{g.title}</div>
        <div className="ls">{g.date ? `${withYear(g.date)} · ` : ""}obiettivo {g.target}</div>
      </div>
      <div className="time">
        {dd !== null && !g.done && !past && <span className="pill warn" style={{ fontWeight: 800 }}>−{dd} gg</span>}
        {g.done && <span className="pill ok">✓</span>}
        {past && !g.done && <span className="pill bad">passato</span>}
      </div>
    </button>
  );
}

function GoalEditor({ g, onClose }: { g: Goal; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ current: g.current ?? "", target: g.target, date: g.date ?? "", detail: g.detail ?? "", sport: g.sport ?? "" });
  async function save() {
    await db.goals.update(g.id, { current: f.current || undefined, target: f.target, date: f.date || undefined, detail: f.detail || undefined, sport: (f.sport || undefined) as "corsa" | "bici" | "nuoto" | undefined });
    toast("Obiettivo aggiornato");
    onClose();
  }
  async function toggleDone() {
    await db.goals.update(g.id, { done: !g.done });
    onClose();
  }
  async function remove() {
    await db.goals.delete(g.id);
    toast("Obiettivo eliminato");
    onClose();
  }
  return (
    <div className="card">
      <h3 className="num" style={{ fontSize: 20, margin: 0 }}>{g.title}</h3>
      <div className="form">
        <label>Sport<select id={`gs-${g.id}`} value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value })}>
          <option value="">Auto (dal titolo)</option>
          <option value="corsa">🏃 Corsa</option>
          <option value="bici">🚴 Bici</option>
          <option value="nuoto">🏊 Nuoto</option>
        </select></label>
        <label>Adesso<input id={`gc-${g.id}`} value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} placeholder="Es. 15:38 (12/11)" /></label>
        <label>Obiettivo<input id={`gt-${g.id}`} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></label>
        <label>Data<input id={`gd-${g.id}`} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        <label>Dettagli<textarea id={`gx-${g.id}`} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></label>
        <div className="row wrap">
          <button className="btn primary" onClick={save}>Salva</button>
          <button className="btn" onClick={toggleDone}>{g.done ? "Riapri" : "Raggiunto"}</button>
          <button className="btn ghost" onClick={remove}>Elimina</button>
          <button className="btn ghost" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

function AddGoal({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ type: "gara" as Goal["type"], title: "", date: "", target: "", current: "", detail: "" });
  async function save() {
    if (!f.title.trim() || !f.target.trim()) { toast("Servono almeno nome e obiettivo"); return; }
    await db.goals.put({ id: uid(), type: f.type, title: f.title.trim(), date: f.date || undefined, target: f.target.trim(), current: f.current.trim() || undefined, detail: f.detail.trim() || undefined });
    toast("Obiettivo aggiunto");
    onDone();
  }
  return (
    <div className="card">
      <div className="form" style={{ marginTop: 0 }}>
        <label>Tipo<select id="ng-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Goal["type"] })}><option value="gara">Gara</option><option value="record">Record</option><option value="test">Test</option></select></label>
        <label>Nome<input id="ng-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label>Data<input id="ng-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        <label>Obiettivo<input id="ng-target" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></label>
        <label>Adesso<input id="ng-current" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></label>
        <label>Dettagli<textarea id="ng-detail" value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></label>
        <div className="row"><button className="btn primary" onClick={save}>Aggiungi</button><button className="btn ghost" onClick={onDone}>Annulla</button></div>
      </div>
    </div>
  );
}

function Weight() {
  const toast = useToast();
  const data = useLiveQuery(async () => ({ list: await db.weights.orderBy("date").toArray(), goal: await db.goals.get("w") }), []);
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(today());
  const [open, setOpen] = useState(false);
  const list = data?.list ?? [];
  const goal = data?.goal;
  const last = list[list.length - 1];
  const first30 = useMemo(() => {
    const cut = parse(today());
    cut.setDate(cut.getDate() - 30);
    const start = `${cut.getFullYear()}-${String(cut.getMonth() + 1).padStart(2, "0")}-${String(cut.getDate()).padStart(2, "0")}`;
    return list.find((w) => w.date >= start);
  }, [list]);
  if (!data) return null;

  async function add() {
    const v = Number(kg.replace(",", "."));
    if (!v || v < 40 || v > 200) { toast("Scrivi un peso valido"); return; }
    await db.weights.put({ date, kg: v });
    await db.goals.update("w", { current: `${v.toLocaleString("it-IT")} kg` });
    setKg("");
    toast("Peso salvato");
    setOpen(false);
  }
  const delta = last && first30 ? last.kg - first30.kg : 0;

  const W = 320, H = 72;
  const vals = list.map((w) => w.kg);
  const min = Math.min(...vals, 72) - 1;
  const max = Math.max(...vals, 86) + 1;
  const pts = list.map((w, i) => {
    const x = list.length === 1 ? W / 2 : (i / (list.length - 1)) * (W - 20) + 10;
    const y = H - 8 - ((w.kg - min) / (max - min)) * (H - 16);
    return `${x},${y}`;
  });
  const area = list.length > 1 ? `M${pts[0]} L${pts.slice(1).join(" L")} L${W},${H} L0,${H} Z` : "";
  // target line
  const targetKgMatch = goal?.target?.match(/(\d{2,3})/);
  const targetKg = targetKgMatch ? Number(targetKgMatch[1]) : undefined;
  const targetY = targetKg !== undefined ? H - 8 - ((targetKg - min) / (max - min)) * (H - 16) : undefined;

  return (
    <>
      <h2 className="sec">Peso</h2>
      <div className="weight-card">
        <div className="weight-head">
          <div>
            <div className="weight-k">Peso</div>
            <div className="weight-t">Obiettivo {goal?.target ?? "—"}</div>
          </div>
          <div className="weight-now">
            <div className="n">{last ? last.kg.toLocaleString("it-IT") : "—"}<small>kg</small></div>
            {last && delta !== 0 && <div style={{ fontSize: 11, fontWeight: 800, color: delta < 0 ? "var(--ok)" : "var(--warn)", marginTop: 2 }}>{delta < 0 ? "▼" : "▲"} {Math.abs(delta).toLocaleString("it-IT", { maximumFractionDigits: 1 })} in 30 gg</div>}
          </div>
        </div>
        {list.length > 0 && (
          <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Andamento del peso" style={{ marginTop: 10 }}>
            <defs>
              <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--bike)" stopOpacity="0.35"/>
                <stop offset="1" stopColor="var(--bike)" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {area && <path d={area} fill="url(#wg)"/>}
            <polyline points={pts.join(" ")} fill="none" stroke="var(--ok)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
            {targetY !== undefined && <line x1="0" x2={W} y1={targetY} y2={targetY} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7"/>}
            {pts.length > 0 && <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r={4} fill="var(--ok)"/>}
          </svg>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em" }}>
          <span>{first30 ? `${first30.kg.toLocaleString("it-IT")} kg · 30 gg fa` : "—"}</span>
          <span>{last ? `oggi · ${last.kg.toLocaleString("it-IT")} kg` : ""}</span>
        </div>
        {open ? (
          <div className="form">
            <div className="grid">
              <label>Data<input id="w-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label>Kg<input id="w-kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} /></label>
              <label>&nbsp;<button className="btn primary" onClick={add}>Salva</button></label>
            </div>
            <button className="btn ghost" onClick={() => setOpen(false)}>Annulla</button>
          </div>
        ) : (
          <button className="btn" style={{ marginTop: 12, width: "100%" }} onClick={() => setOpen(true)}>+ Pesata di oggi</button>
        )}
      </div>
    </>
  );
}

