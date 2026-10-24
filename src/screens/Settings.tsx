import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db, exportAll, getSetting, importAll } from "../data/db";
import { connect, disconnect, getAuth, sync } from "../data/strava";
import { PROGRAMS, buildSessions } from "../data/seed";
import { useToast } from "../components/ui";

function Chev() {
  return <svg className="chev" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function Settings() {
  const toast = useToast();
  const auth = useLiveQuery(() => getAuth(), []);
  const lastSync = useLiveQuery(() => getSetting<number>("stravaLastSync"), []);
  const stravaCount = useLiveQuery(() => db.strava.count(), []);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const error = window.location.hash.includes("errore=strava");

  async function doSync() {
    setBusy(true);
    try {
      const r = await sync();
      toast(`Strava: ${r.added} nuove attività, ${r.matched} abbinate`);
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  }

  async function doExport() {
    const json = await exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `allenamenti-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup scaricato");
  }

  async function doImport(file: File) {
    try {
      await importAll(await file.text());
      toast("Backup ripristinato");
    } catch (e) {
      toast((e as Error).message || "File non valido");
    }
  }

  async function resetPrograms() {
    await db.transaction("rw", [db.programs, db.sessions], async () => {
      await db.programs.clear();
      await db.sessions.filter((s) => !s.id.startsWith("x-")).delete();
      await db.programs.bulkPut(PROGRAMS);
      await db.sessions.bulkPut(buildSessions());
    });
    setConfirmReset(false);
    toast("Programmi ripristinati");
  }

  const lastSyncLabel = lastSync ? new Date(lastSync * 1000).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "mai";
  const athleteName = auth?.athlete || "Samu";
  const initials = athleteName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      {/* Profile card */}
      <div className="profile-card">
        <div className="profile-ava" aria-label="Avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile-name">{athleteName}</div>
          <div className="profile-sub">Triathlon 2027 · Firenze</div>
        </div>
      </div>

      {/* Strava card */}
      <div className="strava-card">
        {error && <p className="small" style={{ margin: "0 0 8px", background: "rgba(255,255,255,0.2)", padding: "6px 10px", borderRadius: 10 }}>Il collegamento con Strava non è riuscito. Riprova.</p>}
        <div className="sc-top">
          <span className="sc-logo">STRAVA</span>
          <span className={`sc-badge${auth ? "" : " off"}`}><span className="d" />{auth ? "Collegato" : "Non collegato"}</span>
        </div>
        <div className="sc-title">{auth ? "Sincronizzazione attiva" : "Collega il tuo account"}</div>
        <div className="sc-sub">
          {auth
            ? `Ultima sincro · ${lastSyncLabel}${stravaCount ? ` · ${stravaCount} attività` : ""}`
            : "Importa uscite e corse con km, tempi e battiti."}
        </div>
        <div className="sc-row">
          <span className="pill-l">{auth?.athlete ? `👤 ${auth.athlete}` : "👤 nessun atleta"}</span>
          {auth ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sc-btn ghost" onClick={async () => { await disconnect(); toast("Strava scollegato"); }}>Scollega</button>
              <button className="sc-btn" onClick={doSync} disabled={busy}>{busy ? "Sincronizzo…" : "Sincronizza"}</button>
            </div>
          ) : (
            <button className="sc-btn" onClick={connect}>Collega</button>
          )}
        </div>
      </div>

      {/* Preferenze (placeholder visual) */}
      <div className="sh-sm">Preferenze</div>
      <div className="settings-group">
        <div className="set-row">
          <div className="ico ico-orange" aria-hidden="true">🔔</div>
          <div><div className="r-t">Notifiche</div><div className="r-s">Promemoria sedute e test (presto)</div></div>
          <span className="val">—</span>
        </div>
        <div className="set-row">
          <div className="ico ico-blue" aria-hidden="true">🌙</div>
          <div><div className="r-t">Tema</div><div className="r-s">Si adatta al sistema</div></div>
          <span className="val">Auto</span>
        </div>
        <div className="set-row">
          <div className="ico ico-green" aria-hidden="true">📏</div>
          <div><div className="r-t">Unità</div><div className="r-s">Km, metri, kg, °C</div></div>
          <span className="val">Metrico</span>
        </div>
      </div>

      {/* Dati */}
      <div className="sh-sm">Dati</div>
      <div className="settings-group">
        <button className="set-row" onClick={doExport}>
          <div className="ico ico-purple" aria-hidden="true">💾</div>
          <div><div className="r-t">Esporta backup</div><div className="r-s">File JSON, da salvare o passare su un altro dispositivo</div></div>
          <Chev />
        </button>
        <button className="set-row" onClick={() => fileRef.current?.click()}>
          <div className="ico ico-gray" aria-hidden="true">📥</div>
          <div><div className="r-t">Ripristina da file</div><div className="r-s">Carica un backup salvato</div></div>
          <Chev />
        </button>
        <input ref={fileRef} id="restore-file" type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        <button className={`set-row${confirmReset ? "" : " danger"}`} onClick={() => setConfirmReset(!confirmReset)}>
          <div className="ico ico-pink" aria-hidden="true">♻️</div>
          <div><div className="r-t">Ripristina programmi</div><div className="r-s">Riscrive il seed · registro, Strava e obiettivi restano</div></div>
          <Chev />
        </button>
      </div>
      {confirmReset && (
        <div className="card">
          <p className="small" style={{ margin: 0 }}>Sicuro? Le sedute originali tornano alle date del seed. Le sedute extra (segnate con “x-”) e tutto il resto non vengono toccate.</p>
          <div className="btns">
            <button className="btn bad sel" onClick={resetPrograms}>Sì, ripristina</button>
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>Annulla</button>
          </div>
        </div>
      )}

      <p className="tiny muted" style={{ textAlign: "center", margin: "4px 0 0" }}>Allenamenti · v1.0 · fatta a Firenze</p>
    </>
  );
}
