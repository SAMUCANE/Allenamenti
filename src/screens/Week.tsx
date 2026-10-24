import { useState } from "react";
import { addDays, long, mondayOf, short, today, weekday } from "../data/dates";
import { useRange, type DayItem } from "../data/hooks";
import { SessionCard } from "../components/SessionCard";
import { Icon, SPORT_COLOR, fmtMin } from "../components/ui";

const DOW = ["L", "M", "M", "G", "V", "S", "D"];

export function Week() {
  const t = today();
  const [mon, setMon] = useState(mondayOf(t));
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState<string>(t);
  const sun = addDays(mon, 6);
  const data = useRange(mon, sun);
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));

  const items = data?.items.filter((i) => i.session.sport !== "mobilita") ?? [];
  const done = items.filter((i) => i.log && i.log.status !== "saltato").length;
  const logs = (data?.logs ?? []).filter((l) => l.status !== "saltato");
  const runKm = logs.filter((l) => l.sport === "corsa").reduce((s, l) => s + (l.km ?? 0), 0);
  const bikeMin = logs.filter((l) => l.sport === "bici").reduce((s, l) => s + (l.minutes ?? 0), 0);
  const swimM = logs.filter((l) => l.sport === "nuoto").reduce((s, l) => s + (l.km ?? 0) * 1000, 0);
  const partial = items.filter((i) => i.log?.status === "parziale").length;
  const skipped = items.filter((i) => i.log?.status === "saltato").length;

  function statusOf(d: string): "done" | "part" | "todo" | "skip" {
    const dayItems = items.filter((i) => i.session.date === d);
    if (dayItems.length === 0) return "todo";
    if (dayItems.every((i) => i.log?.status === "fatto")) return "done";
    if (dayItems.some((i) => i.log?.status === "fatto" || i.log?.status === "parziale")) return "part";
    if (dayItems.every((i) => i.log?.status === "saltato")) return "skip";
    return "todo";
  }

  const focusItems = (data?.items ?? []).filter((i) => i.session.date === focusDay);
  const focusExtra = (data?.freeStrava ?? []).filter((a) => a.date === focusDay);
  const focusFreeLogs = (data?.freeLogs ?? []).filter((l) => l.date === focusDay);

  return (
    <>
      {/* Week navigator */}
      <div className="week-head">
        <button className="ikon" onClick={() => setMon(addDays(mon, -7))} aria-label="Settimana precedente"><Icon name="left" size={18} /></button>
        <div>
          <div className="label-range">{short(mon)} – {short(sun)}</div>
          {mon !== mondayOf(t) && <button className="today-link" onClick={() => { setMon(mondayOf(t)); setFocusDay(t); }}>Torna a oggi</button>}
        </div>
        <button className="ikon" onClick={() => setMon(addDays(mon, 7))} aria-label="Settimana successiva"><Icon name="right" size={18} /></button>
      </div>

      {/* Overview salvia card with 7 day pills */}
      <div className="week-overview">
        <div className="wk-top">
          <span className="wk-label">Overview</span>
          <div className="wk-score"><span className="n">{done}</span><span className="d">/ {items.length} sedute</span></div>
        </div>
        <div className="wk-days" role="list">
          {days.map((d, i) => {
            const st = statusOf(d);
            const n = Number(short(d).split(" ")[0]);
            const isToday = d === t;
            const isFocus = d === focusDay;
            return (
              <button key={d} className="wk-day" onClick={() => setFocusDay(d)} aria-label={`${long(d)}: ${st}`} aria-current={isFocus ? "true" : undefined}>
                <span className="dow">{DOW[i]}</span>
                <span className={`wk-dot ${st}${isToday ? " today" : ""}`} style={isFocus && !isToday ? { boxShadow: "0 0 0 2px rgba(255,255,255,0.9)" } : undefined}>
                  {n}
                  {st === "done" && <span className="mk">✓</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="wk-foot">
          <span className="pill-l">{done} fatte{partial ? ` · ${partial} parziali` : ""}{skipped ? ` · ${skipped} saltate` : ""}</span>
          {items.length > 0 && done >= items.length && <span className="pill-l">🏆 settimana piena</span>}
        </div>
      </div>

      {/* 3 KPI tiles */}
      <div className="kpi-row">
        <div className="kpi-tile kpi-run">
          <span className="emoji" aria-hidden="true">🏃</span>
          <div>
            <div className="big">{runKm.toLocaleString("it-IT", { maximumFractionDigits: 1 })}<small>km</small></div>
            <div className="sub">corsa</div>
          </div>
        </div>
        <div className="kpi-tile kpi-swim">
          <span className="emoji" aria-hidden="true">🏊</span>
          <div>
            <div className="big">{swimM.toLocaleString("it-IT", { maximumFractionDigits: 0 })}<small>m</small></div>
            <div className="sub">nuoto</div>
          </div>
        </div>
        <div className="kpi-tile kpi-bike">
          <span className="emoji" aria-hidden="true">🚴</span>
          <div>
            <div className="big">{fmtMin(bikeMin) || "0'"}</div>
            <div className="sub">bici</div>
          </div>
        </div>
      </div>

      {/* Focused day detail */}
      <h2 className="sec" style={{ textTransform: "capitalize" }}>{long(focusDay)}</h2>
      {focusItems.length === 0 && focusExtra.length === 0 && focusFreeLogs.length === 0 && (
        <div className="card empty">Riposo. Niente in programma.</div>
      )}
      {focusItems.map((i: DayItem) => (
        <div key={i.session.id}>
          <button className="mini" onClick={() => setOpenId(openId === i.session.id ? null : i.session.id)} aria-expanded={openId === i.session.id} style={{ padding: "6px 0" }}>
            <span className="dot" style={{ ["--c" as string]: SPORT_COLOR[i.session.sport] }} />
            <span className="s"><b>{i.session.title}</b> <span className="small muted">· {i.session.detail.length > 60 ? i.session.detail.slice(0, 58) + "…" : i.session.detail}</span></span>
            {i.log?.status === "fatto" && <span style={{ color: "var(--ok)" }}>✓</span>}
            {i.log?.status === "parziale" && <span style={{ color: "var(--warn)" }}>◐</span>}
            {i.log?.status === "saltato" && <span style={{ color: "var(--bad)" }}>✕</span>}
          </button>
          {openId === i.session.id && <SessionCard {...i} />}
        </div>
      ))}
      {focusFreeLogs.map((l) => (
        <div key={l.id} className="mini"><span className="dot" style={{ ["--c" as string]: SPORT_COLOR[l.sport] }} /><span className="s">{l.title} <span className="small muted">· fuori programma</span></span><span style={{ color: "var(--ok)" }}>✓</span></div>
      ))}
      {focusExtra.map((a) => (
        <div key={a.id} className="mini"><span className="dot" style={{ ["--c" as string]: SPORT_COLOR[a.sport] }} /><span className="s">{a.name} <span className="small muted">· Strava</span></span></div>
      ))}

      <p className="tiny muted" style={{ textAlign: "center", margin: 0 }}>Tocca un cerchio per vedere il dettaglio del giorno · oggi è {weekday(t)}</p>
    </>
  );
}
