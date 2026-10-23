import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, uid } from "../data/db";
import { daysBetween, short, today, withYear } from "../data/dates";
import type { Goal } from "../data/types";
import { useToast } from "../components/ui";

const GROUPS: { type: Goal["type"]; label: string }[] = [
  { type: "gara", label: "Gare" },
  { type: "record", label: "Record sui segmenti" },
  { type: "test", label: "Test" },
];

export function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [adding, setAdding] = useState(false);
  if (!goals) return null;
  return (
    <>
      {GROUPS.map((g) => {
        const list = goals.filter((x) => x.type === g.type).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
        if (!list.length) return null;
        return (
          <section key={g.type} style={{ display: "grid", gap: 10 }}>
            <h2 className="sec">{g.label}</h2>
            {list.map((x) => <GoalCard key={x.id} g={x} />)}
          </section>
        );
      })}
      <Weight />
      {adding ? <AddGoal onDone={() => setAdding(false)} /> : <button className="btn" onClick={() => setAdding(true)}>+ Nuovo obiettivo</button>}
    </>
  );
}

function GoalCard({ g }: { g: Goal }) {
  const toast = useToast();
  const t = today();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ current: g.current ?? "", target: g.target, date: g.date ?? "", detail: g.detail ?? "" });
  const dd = g.date ? daysBetween(t, g.date) : null;
  async function save() {
    await db.goals.update(g.id, { current: f.current || undefined, target: f.target, date: f.date || undefined, detail: f.detail || undefined });
    setEdit(false);
    toast("Obiettivo aggiornato");
  }
  async function toggleDone() {
    await db.goals.update(g.id, { done: !g.done });
  }
  async function remove() {
    await db.goals.delete(g.id);
    toast("Obiettivo eliminato");
  }
  return (
    <div className={`card${g.type === "gara" ? " test" : ""}`} style={g.done ? { opacity: 0.6 } : undefined}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="num" style={{ fontSize: 22, margin: 0 }}>{g.done ? "✓ " : ""}{g.title}</h3>
          <div className="small muted">{g.date ? withYear(g.date) : ""}{g.dateNote ? `${g.date ? " · " : ""}${g.dateNote}` : ""}</div>
        </div>
        {dd !== null && dd >= 0 && !g.done && <div style={{ textAlign: "right" }}><div className="big">{dd}</div><div className="tiny muted">giorni</div></div>}
      </div>
      {g.detail && <p className="small" style={{ margin: "6px 0 0" }}>{g.detail}</p>}
      <div className="row wrap" style={{ marginTop: 8, gap: 16 }}>
        {g.current && <div><div className="tiny muted">ADESSO</div><b>{g.current}</b></div>}
        <div><div className="tiny muted">OBIETTIVO</div><b>{g.target}</b></div>
      </div>
      <div className="btns">
        <button className="btn ghost" onClick={() => setEdit(!edit)} aria-expanded={edit}>Aggiorna</button>
        <button className="btn ghost" onClick={toggleDone}>{g.done ? "Riapri" : "Raggiunto"}</button>
      </div>
      {edit && (
        <div className="form">
          <label>Adesso<input id={`gc-${g.id}`} value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} placeholder="Es. 15:38 (12/11)" /></label>
          <label>Obiettivo<input id={`gt-${g.id}`} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></label>
          <label>Data<input id={`gd-${g.id}`} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label>Dettagli<textarea id={`gx-${g.id}`} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></label>
          <div className="row"><button className="btn primary" onClick={save}>Salva</button><button className="btn ghost" onClick={remove}>Elimina</button></div>
        </div>
      )}
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
  if (!data) return null;
  const { list, goal } = data;
  async function add() {
    const v = Number(kg.replace(",", "."));
    if (!v || v < 40 || v > 200) { toast("Scrivi un peso valido"); return; }
    await db.weights.put({ date, kg: v });
    await db.goals.update("w", { current: `${v.toLocaleString("it-IT")} kg` });
    setKg("");
    toast("Peso salvato");
  }
  const vals = list.map((w) => w.kg);
  const min = Math.min(...vals, 76) - 1, max = Math.max(...vals, 86) + 1;
  const W = 320, H = 70;
  const pts = list.map((w, i) => `${list.length === 1 ? W / 2 : (i / (list.length - 1)) * (W - 20) + 10},${H - 8 - ((w.kg - min) / (max - min)) * (H - 16)}`);
  const last = list[list.length - 1];
  return (
    <section style={{ display: "grid", gap: 10 }}>
      <h2 className="sec">Peso</h2>
      <div className="card">
        <div className="row between">
          <div><div className="big">{last ? last.kg.toLocaleString("it-IT") : "—"}<span className="small muted"> kg</span></div><div className="tiny muted">{last ? `ultimo: ${short(last.date)}` : ""}</div></div>
          <div style={{ textAlign: "right" }}><div className="tiny muted">OBIETTIVO</div><b>{goal?.target ?? "—"}</b></div>
        </div>
        {list.length > 0 && (
          <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Andamento del peso">
            <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            {pts.length > 0 && <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r={4} fill="var(--accent)" />}
          </svg>
        )}
        <div className="form">
          <div className="grid">
            <label>Data<input id="w-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Kg<input id="w-kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} /></label>
            <label>&nbsp;<button className="btn primary" onClick={add}>Salva</button></label>
          </div>
        </div>
      </div>
    </section>
  );
}
