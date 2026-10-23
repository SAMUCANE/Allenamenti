import { useState } from "react";
import { db, uid } from "../data/db";
import type { LogEntry, PlannedSession, Status, StravaActivity } from "../data/types";
import { SPORT_COLOR, SportChip, fmtKm, fmtMin, useToast } from "./ui";
import { long } from "../data/dates";

const KIND_LABEL: Record<string, string> = {
  qualita: "Qualità", lunga: "Lunga", facile: "Facile", test: "Test", gara: "Gara", forza: "Forza", tecnica: "Tecnica", recupero: "Recupero",
};

interface Props {
  session: PlannedSession;
  log?: LogEntry;
  strava?: StravaActivity;
  showDate?: boolean;
}

export function SessionCard({ session, log, strava, showDate }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [form, setForm] = useState({
    minutes: log?.minutes?.toString() ?? "",
    km: log?.km?.toString() ?? "",
    avgHr: log?.avgHr?.toString() ?? "",
    rpe: log?.rpe ?? 5,
    note: log?.note ?? "",
  });
  const [newDate, setNewDate] = useState(session.date);

  async function setStatus(status: Status) {
    if (log) {
      if (log.status === status) {
        await db.logs.delete(log.id);
        toast("Stato tolto");
        return;
      }
      await db.logs.update(log.id, { status });
    } else {
      await db.logs.put({
        id: uid(), date: session.date, plannedId: session.id, sport: session.sport, title: session.title,
        status, createdAt: Date.now(),
      });
    }
    toast(status === "fatto" ? "Segnata come fatta" : status === "parziale" ? "Segnata come parziale" : "Segnata come saltata");
    if (status !== "saltato") setOpen(true);
  }

  async function saveDetails() {
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));
    const patch = { minutes: num(form.minutes), km: num(form.km), avgHr: num(form.avgHr), rpe: form.rpe, note: form.note.trim() || undefined };
    if (log) await db.logs.update(log.id, patch);
    else await db.logs.put({ id: uid(), date: session.date, plannedId: session.id, sport: session.sport, title: session.title, status: "fatto", createdAt: Date.now(), ...patch });
    setOpen(false);
    toast("Salvato");
  }

  async function move() {
    if (!newDate || newDate === session.date) { setMoving(false); return; }
    await db.sessions.update(session.id, { date: newDate });
    if (log) await db.logs.update(log.id, { date: newDate });
    setMoving(false);
    toast(`Spostata a ${long(newDate)}`);
  }

  const st = log?.status;
  return (
    <article className={`card session${session.kind === "test" || session.kind === "gara" ? " test" : ""}`} style={{ ["--c" as string]: SPORT_COLOR[session.sport] }}>
      <div className="row wrap">
        <SportChip sport={session.sport} />
        <span className="pill">{KIND_LABEL[session.kind]}{session.week ? ` · sett. ${session.week}` : ""}</span>
        {showDate && <span className="small muted">{long(session.date)}</span>}
        {st === "fatto" && <span className="pill ok">✓ Fatta</span>}
        {st === "parziale" && <span className="pill warn">Parziale</span>}
        {st === "saltato" && <span className="pill bad">Saltata</span>}
      </div>
      <h3>{session.title}</h3>
      <p>{session.detail}</p>
      {session.target && <div className="target">{session.target}</div>}

      {(log?.minutes || log?.km || log?.avgHr || log?.note || strava) && (
        <div className="small muted" style={{ marginTop: 8 }}>
          {[fmtMin(log?.minutes ?? strava?.movingMin), fmtKm(log?.km ?? strava?.km), (log?.avgHr ?? strava?.avgHr) ? `${log?.avgHr ?? strava?.avgHr} bpm` : "", log?.rpe ? `fatica ${log.rpe}/10` : ""].filter(Boolean).join(" · ")}
          {strava && <> · da Strava: <i>{strava.name}</i></>}
          {log?.note && <div style={{ marginTop: 4 }}>“{log.note}”</div>}
        </div>
      )}

      <div className="btns">
        <button className={`btn ok${st === "fatto" ? " sel" : ""}`} onClick={() => setStatus("fatto")}>Fatta</button>
        <button className={`btn warn${st === "parziale" ? " sel" : ""}`} onClick={() => setStatus("parziale")}>Parziale</button>
        <button className={`btn bad${st === "saltato" ? " sel" : ""}`} onClick={() => setStatus("saltato")}>Saltata</button>
        <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open}>Dettagli</button>
        <button className="btn ghost" onClick={() => setMoving(!moving)} aria-expanded={moving}>Sposta</button>
      </div>

      {moving && (
        <div className="form">
          <label htmlFor={`mv-${session.id}`}>Nuova data</label>
          <div className="row">
            <input id={`mv-${session.id}`} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <button className="btn primary" onClick={move}>Sposta</button>
          </div>
        </div>
      )}

      {open && (
        <div className="form">
          <div className="grid">
            <label>Minuti<input id={`m-${session.id}`} inputMode="numeric" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></label>
            <label>Km<input id={`k-${session.id}`} inputMode="decimal" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} /></label>
            <label>Battiti medi<input id={`h-${session.id}`} inputMode="numeric" value={form.avgHr} onChange={(e) => setForm({ ...form, avgHr: e.target.value })} /></label>
          </div>
          <label>Fatica percepita: {form.rpe}/10
            <input id={`r-${session.id}`} type="range" min={1} max={10} value={form.rpe} onChange={(e) => setForm({ ...form, rpe: Number(e.target.value) })} />
          </label>
          <label>Note e sensazioni<textarea id={`n-${session.id}`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Gambe, meteo, fastidi…" /></label>
          <div className="row"><button className="btn primary" onClick={saveDetails}>Salva</button></div>
        </div>
      )}
    </article>
  );
}
