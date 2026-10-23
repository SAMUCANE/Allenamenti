import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db, uid } from "../data/db";
import { addDays, daysBetween, long, mondayOf, short, today, weekday } from "../data/dates";
import { useRange } from "../data/hooks";
import { SessionCard } from "../components/SessionCard";
import { SPORT_COLOR, SportChip, fmtKm, fmtMin, useToast } from "../components/ui";
import type { StravaActivity } from "../data/types";

export function Today() {
  const t = today();
  const mon = mondayOf(t);
  const day = useRange(t, t);
  const next = useRange(addDays(t, 1), addDays(t, 3));
  const week = useRange(mon, addDays(mon, 6));
  const toast = useToast();
  const races = useLiveQuery(() => db.goals.where("type").anyOf(["gara", "test"]).toArray(), []);
  const future = (races ?? []).filter((g) => g.date && g.date >= t && !g.done).sort((a, b) => a.date!.localeCompare(b.date!));
  const nextTest = future.find((g) => g.type === "test");
  const upcoming = [...(nextTest ? [nextTest] : []), ...future.filter((g) => g.type === "gara").slice(0, 2)];
  const SHORT: Record<string, string> = { "g-chiusi": "Sprint Chiusi", "g-sella": "Sella Ronda" };
  const label = (g: (typeof future)[number]) => SHORT[g.id] ?? g.title.replace(" (tapis roulant)", "").replace(" su strada", "");

  const wk = week?.items.filter((i) => i.session.sport !== "mobilita") ?? [];
  const done = wk.filter((i) => i.log?.status === "fatto" || i.log?.status === "parziale").length;
  const runKm = (week?.logs ?? []).filter((l) => l.sport === "corsa" && l.status !== "saltato").reduce((s, l) => s + (l.km ?? 0), 0);

  async function addStrava(a: StravaActivity) {
    if (a.sport === "altro") return;
    await db.logs.put({ id: uid(), date: a.date, sport: a.sport, title: a.name, status: "fatto", minutes: a.movingMin, km: a.km || undefined, avgHr: a.avgHr, stravaId: a.id, createdAt: Date.now() });
    toast("Aggiunta al registro");
  }

  return (
    <>
      {upcoming.length > 0 && (
        <div className="card">
          <div className="row wrap" style={{ gap: 18 }}>
            {upcoming.map((g) => (
              <Link key={g.id} to="/obiettivi" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
                <b>{daysBetween(t, g.date!)} gg</b>
                <span>{label(g)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="sec">Oggi</h2>
      {day?.items.length ? (
        day.items.map((i) => <SessionCard key={i.session.id + (i.log?.id ?? "")} {...i} />)
      ) : (
        <div className="card empty">Nessuna seduta in programma oggi. Recupera bene.</div>
      )}

      {day?.freeStrava.map((a) => (
        <div key={a.id} className="card" style={{ borderLeft: `5px solid ${SPORT_COLOR[a.sport]}` }}>
          <div className="row wrap"><SportChip sport={a.sport} /><span className="pill">Da Strava, fuori programma</span></div>
          <h3 className="num" style={{ fontSize: 21, margin: "6px 0 2px" }}>{a.name}</h3>
          <div className="small muted">{[fmtKm(a.km), fmtMin(a.movingMin), a.avgHr ? `${a.avgHr} bpm` : ""].filter(Boolean).join(" · ")}</div>
          {a.sport !== "altro" && <div className="btns"><button className="btn" onClick={() => addStrava(a)}>Aggiungi al registro</button></div>}
        </div>
      ))}

      <h2 className="sec">Questa settimana</h2>
      <div className="card">
        <div className="stats">
          <div className="stat"><b>{done}/{wk.length}</b><span>sedute fatte</span></div>
          <div className="stat"><b>{runKm.toLocaleString("it-IT", { maximumFractionDigits: 1 })}</b><span>km di corsa</span></div>
          <div className="stat"><b>{wk.length ? Math.round((done / wk.length) * 100) : 0}%</b><span>completato</span></div>
        </div>
        <div className="bar" style={{ marginTop: 12 }}><i style={{ width: `${wk.length ? (done / wk.length) * 100 : 0}%` }} /></div>
      </div>

      <h2 className="sec">Prossimi giorni</h2>
      <div className="card list">
        {next?.items.filter((i) => i.session.sport !== "mobilita").map((i) => (
          <div key={i.session.id} className="li">
            <div className="d"><b>{short(i.session.date).split(" ")[0]}</b>{weekday(i.session.date)}</div>
            <div><div className="row"><span className="dot" style={{ ["--c" as string]: SPORT_COLOR[i.session.sport] }} /><span className="t">{i.session.title}</span></div><div className="small muted">{i.session.detail}</div></div>
            <div />
          </div>
        ))}
        {next && next.items.filter((i) => i.session.sport !== "mobilita").length === 0 && <div className="empty">Niente in programma nei prossimi tre giorni.</div>}
      </div>
      <p className="tiny muted" style={{ margin: 0 }}>{long(t)}</p>
    </>
  );
}
