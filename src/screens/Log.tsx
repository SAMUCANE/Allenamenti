import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, uid } from "../data/db";
import { addDays, short, today, weekday } from "../data/dates";
import { getAuth, sync } from "../data/strava";
import type { Sport, Status } from "../data/types";
import { SPORT_LABEL } from "../data/types";
import { Icon, SPORT_COLOR, fmtKm, fmtMin, useToast } from "../components/ui";

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
}

export function Log() {
  const toast = useToast();
  const [days, setDays] = useState(45);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
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
        key: l.id, date: l.date, sport: l.sport, title: l.title, status: l.status, source: "registro", note: l.note, logId: l.id,
        meta: [fmtKm(l.km ?? a?.km), fmtMin(l.minutes ?? a?.movingMin), (l.avgHr ?? a?.avgHr) ? `${l.avgHr ?? a?.avgHr} bpm` : "", l.rpe ? `fatica ${l.rpe}/10` : "", a ? "Strava" : ""].filter(Boolean).join(" · "),
      };
    });
    for (const a of strava) {
      if (linked.has(a.id)) continue;
      out.push({ key: "s" + a.id, date: a.date, sport: a.sport, title: a.name, source: "strava", meta: [fmtKm(a.km), fmtMin(a.movingMin), a.avgHr ? `${a.avgHr} bpm` : "", a.elev ? `+${a.elev} m` : ""].filter(Boolean).join(" · ") });
    }
    return out.sort((x, y) => y.date.localeCompare(x.date));
  }, [from]);

  async function doSync() {
    setBusy(true);
    try {
      const r = await sync();
      toast(`Strava: ${r.added} nuove attività, ${r.matched} abbinate al programma`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await db.logs.delete(id);
    toast("Voce eliminata");
  }

  return (
    <>
      <div className="row wrap">
        <button className="btn" onClick={() => setAdding(!adding)} aria-expanded={adding}><span className="row" style={{ gap: 6 }}><Icon name="plus" size={18} />Allenamento</span></button>
        {auth ? (
          <button className="btn" onClick={doSync} disabled={busy}><span className="row" style={{ gap: 6 }}><Icon name="sync" size={18} />{busy ? "Sincronizzo…" : "Sincronizza Strava"}</span></button>
        ) : (
          <span className="small muted">Collega Strava dalle impostazioni ⚙︎ per importare le attività.</span>
        )}
      </div>
      {adding && <AddLog onDone={() => setAdding(false)} />}

      <div className="card list">
        {rows?.length === 0 && <div className="empty">Ancora niente qui. Segna le sedute dalla schermata Oggi o sincronizza Strava.</div>}
        {rows?.map((r) => (
          <div key={r.key} className="li">
            <div className="d"><b>{short(r.date).split(" ")[0]}</b>{weekday(r.date)} {short(r.date).split(" ")[1]}</div>
            <div>
              <div className="row"><span className="dot" style={{ ["--c" as string]: SPORT_COLOR[r.sport] }} /><span className="t">{r.title}</span></div>
              <div className="small muted">{r.meta || (r.source === "strava" ? "Strava" : "")}</div>
              {r.note && <div className="small">“{r.note}”</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              {r.status === "fatto" && <span className="pill ok">Fatta</span>}
              {r.status === "parziale" && <span className="pill warn">Parziale</span>}
              {r.status === "saltato" && <span className="pill bad">Saltata</span>}
              {r.source === "strava" && <span className="pill">Strava</span>}
              {r.logId && <div><button className="btn ghost tiny" style={{ minHeight: 0, padding: "2px 6px", marginTop: 4 }} onClick={() => remove(r.logId!)} aria-label={`Elimina ${r.title}`}>Elimina</button></div>}
            </div>
          </div>
        ))}
      </div>
      <button className="btn ghost" onClick={() => setDays(days + 60)}>Mostra più vecchi</button>
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
