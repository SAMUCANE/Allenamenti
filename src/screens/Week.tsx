import { useState } from "react";
import { addDays, long, mondayOf, short, today } from "../data/dates";
import { useRange, type DayItem } from "../data/hooks";
import { SessionCard } from "../components/SessionCard";
import { Icon, SPORT_COLOR, fmtMin } from "../components/ui";

export function Week() {
  const t = today();
  const [mon, setMon] = useState(mondayOf(t));
  const [openId, setOpenId] = useState<string | null>(null);
  const sun = addDays(mon, 6);
  const data = useRange(mon, sun);
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));

  const items = data?.items.filter((i) => i.session.sport !== "mobilita") ?? [];
  const done = items.filter((i) => i.log && i.log.status !== "saltato").length;
  const logs = (data?.logs ?? []).filter((l) => l.status !== "saltato");
  const runKm = logs.filter((l) => l.sport === "corsa").reduce((s, l) => s + (l.km ?? 0), 0);
  const bikeMin = logs.filter((l) => l.sport === "bici").reduce((s, l) => s + (l.minutes ?? 0), 0);
  const plannedRunKm = items.filter((i) => i.session.sport === "corsa").reduce((s, i) => s + (i.session.km ?? 0), 0);

  function mark(i: DayItem) {
    const st = i.log?.status;
    if (st === "fatto") return <span style={{ color: "var(--ok)" }} aria-label="fatta">✓</span>;
    if (st === "parziale") return <span style={{ color: "var(--warn)" }} aria-label="parziale">◐</span>;
    if (st === "saltato") return <span style={{ color: "var(--bad)" }} aria-label="saltata">✕</span>;
    if (i.session.date < t) return <span className="muted" aria-label="da segnare">?</span>;
    return null;
  }

  return (
    <>
      <div className="weeknav">
        <button className="iconbtn" onClick={() => setMon(addDays(mon, -7))} aria-label="Settimana precedente"><Icon name="left" /></button>
        <div style={{ textAlign: "center" }}>
          <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{short(mon)} – {short(sun)}</div>
          {mon !== mondayOf(t) && <button className="btn ghost tiny" style={{ minHeight: 0, padding: "2px 8px" }} onClick={() => setMon(mondayOf(t))}>Torna a oggi</button>}
        </div>
        <button className="iconbtn" onClick={() => setMon(addDays(mon, 7))} aria-label="Settimana successiva"><Icon name="right" /></button>
      </div>

      <div className="card">
        <div className="stats">
          <div className="stat"><b>{done}/{items.length}</b><span>sedute</span></div>
          <div className="stat"><b>{runKm.toLocaleString("it-IT", { maximumFractionDigits: 1 })}{plannedRunKm ? <small className="muted" style={{ fontSize: 15 }}> / {plannedRunKm}+</small> : null}</b><span>km corsa</span></div>
          <div className="stat"><b>{fmtMin(bikeMin) || "0'"}</b><span>bici</span></div>
        </div>
      </div>

      <div className="card">
        {days.map((d) => {
          const di = data?.items.filter((i) => i.session.date === d) ?? [];
          const extra = (data?.freeStrava ?? []).filter((a) => a.date === d);
          const free = (data?.freeLogs ?? []).filter((l) => l.date === d);
          return (
            <div key={d} className={`day${d === t ? " today" : ""}`}>
              <div className="dh">{long(d)}</div>
              {di.length === 0 && extra.length === 0 && free.length === 0 && <div className="small muted">Riposo</div>}
              {di.map((i) => (
                <div key={i.session.id}>
                  <button className="mini" onClick={() => setOpenId(openId === i.session.id ? null : i.session.id)} aria-expanded={openId === i.session.id}>
                    <span className="dot" style={{ ["--c" as string]: SPORT_COLOR[i.session.sport] }} />
                    <span className="s"><b>{i.session.title}</b> <span className="small muted">· {i.session.detail.length > 60 ? i.session.detail.slice(0, 58) + "…" : i.session.detail}</span></span>
                    {mark(i)}
                  </button>
                  {openId === i.session.id && <div style={{ margin: "6px 0 10px" }}><SessionCard {...i} /></div>}
                </div>
              ))}
              {free.map((l) => (
                <div key={l.id} className="mini"><span className="dot" style={{ ["--c" as string]: SPORT_COLOR[l.sport] }} /><span className="s">{l.title} <span className="small muted">· fuori programma</span></span><span style={{ color: "var(--ok)" }}>✓</span></div>
              ))}
              {extra.map((a) => (
                <div key={a.id} className="mini"><span className="dot" style={{ ["--c" as string]: SPORT_COLOR[a.sport] }} /><span className="s">{a.name} <span className="small muted">· Strava</span></span></div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
