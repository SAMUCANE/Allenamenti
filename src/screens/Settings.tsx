import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db, exportAll, getSetting, importAll } from "../data/db";
import { connect, disconnect, getAuth, sync } from "../data/strava";
import { PROGRAMS, buildSessions } from "../data/seed";
import { useToast } from "../components/ui";

export function Settings() {
  const toast = useToast();
  const auth = useLiveQuery(() => getAuth(), []);
  const lastSync = useLiveQuery(() => getSetting<number>("stravaLastSync"), []);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const error = window.location.hash.includes("errore=strava");

  async function doSync() {
    setBusy(true);
    try {
      const r = await sync();
      toast(`Strava: ${r.added} nuove attività, ${r.matched} abbinate`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
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
    // riscrive i programmi precaricati; registro, Strava, obiettivi e peso restano
    await db.transaction("rw", [db.programs, db.sessions], async () => {
      await db.programs.clear();
      await db.sessions.filter((s) => !s.id.startsWith("x-")).delete();
      await db.programs.bulkPut(PROGRAMS);
      await db.sessions.bulkPut(buildSessions());
    });
    setConfirmReset(false);
    toast("Programmi ripristinati");
  }

  return (
    <>
      <h2 className="sec">Strava</h2>
      <div className="card">
        {error && <p className="small" style={{ color: "var(--bad)", marginTop: 0 }}>Il collegamento con Strava non è riuscito. Riprova.</p>}
        {auth ? (
          <>
            <p style={{ marginTop: 0 }}>Collegato{auth.athlete ? ` come ${auth.athlete}` : ""}.</p>
            <p className="small muted">{lastSync ? `Ultima sincronizzazione: ${new Date(lastSync * 1000).toLocaleString("it-IT")}` : "Mai sincronizzato."} Le attività vengono abbinate alle sedute dello stesso giorno e sport.</p>
            <div className="btns">
              <button className="btn primary" onClick={doSync} disabled={busy}>{busy ? "Sincronizzo…" : "Sincronizza adesso"}</button>
              <button className="btn ghost" onClick={async () => { await disconnect(); toast("Strava scollegato"); }}>Scollega</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>Collega il tuo account per importare uscite e corse con chilometri, tempi e battiti.</p>
            <button className="btn primary" onClick={connect}>Collega Strava</button>
          </>
        )}
      </div>

      <h2 className="sec">Backup</h2>
      <div className="card">
        <p style={{ marginTop: 0 }} className="small">I dati restano su questo telefono. Scarica un backup ogni tanto: ti serve anche per passare i dati su un altro dispositivo.</p>
        <div className="btns">
          <button className="btn" onClick={doExport}>Scarica backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Ripristina da file</button>
          <input ref={fileRef} id="restore-file" type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
      </div>

      <h2 className="sec">Programmi</h2>
      <div className="card">
        <p style={{ marginTop: 0 }} className="small">Ripristina i programmi come erano all'inizio: tornano le date originali delle sedute. Registro, Strava, obiettivi e peso non si toccano.</p>
        {confirmReset ? (
          <div className="btns"><button className="btn bad sel" onClick={resetPrograms}>Sì, ripristina</button><button className="btn ghost" onClick={() => setConfirmReset(false)}>Annulla</button></div>
        ) : (
          <button className="btn" onClick={() => setConfirmReset(true)}>Ripristina programmi</button>
        )}
      </div>
      <p className="tiny muted">Allenamenti · versione 1.0</p>
    </>
  );
}
