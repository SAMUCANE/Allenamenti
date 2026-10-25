import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, uid } from "../data/db";
import { today } from "../data/dates";
import type { Kind, Sport } from "../data/types";
import { SPORT_LABEL } from "../data/types";
import { useToast } from "./ui";

interface Props {
  onDone: () => void;
  initialDate?: string;
}

export function AddSession({ onDone, initialDate }: Props) {
  const toast = useToast();
  const programs = useLiveQuery(() => db.programs.toArray(), []);
  const [f, setF] = useState({
    date: initialDate ?? today(),
    sport: "corsa" as Sport,
    title: "",
    detail: "",
    target: "",
    programId: "run10k",
    kind: "facile" as Kind,
  });

  async function save() {
    if (!f.title.trim()) { toast("Scrivi almeno un titolo"); return; }
    await db.sessions.put({
      id: "x-" + uid(),
      programId: f.programId,
      date: f.date,
      sport: f.sport,
      kind: f.kind,
      title: f.title.trim(),
      detail: f.detail.trim(),
      target: f.target.trim() || undefined,
    });
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
