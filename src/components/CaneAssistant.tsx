import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db } from "../data/db";
import { addDays, today } from "../data/dates";

// Set of contextual phrases Akela says. Picked on each open based on time + data.
function pickPhrase(ctx: { hour: number; todayCount: number; nextTitle?: string; streak: number; daysToTest?: number }): string {
  const bank: string[] = [];
  if (ctx.daysToTest !== undefined && ctx.daysToTest <= 3) {
    bank.push(`Mancano ${ctx.daysToTest} giorni al test. Oggi tieni i tendini caldi.`);
    bank.push("Il test è vicino: dormi bene e idratati, umano.");
  }
  if (ctx.todayCount === 0) {
    bank.push("Oggi riposo. Portami al parco invece di correre?");
    bank.push("Nessuna seduta oggi: va benissimo recuperare.");
  } else if (ctx.nextTitle) {
    bank.push(`Pronto per ${ctx.nextTitle}? Ti aspetto per lo scodinzolio finale.`);
    bank.push(`${ctx.nextTitle}: parti piano, finisci forte.`);
  }
  if (ctx.streak >= 5) bank.push(`Streak di ${ctx.streak} giorni. Sei un lupo.`);
  if (ctx.hour < 7) bank.push("Troppo presto anche per me. Riprova dopo una ciotola.");
  else if (ctx.hour < 12) bank.push("Buongiorno! Caffè per te, crocchette per me.");
  else if (ctx.hour < 17) bank.push("Pomeriggio buono per una lenta in zona 2.");
  else if (ctx.hour < 21) bank.push("Allenamento serale? Ricordati di mangiare prima.");
  else bank.push("Giornata finita. Vai a dormire che domani si corre.");
  // Fallback evergreen
  bank.push("Un passo alla volta, zampetta dopo zampetta.");
  bank.push("Respira. Io respiro con la lingua di fuori, tu col naso.");
  return bank[Math.floor(Math.random() * bank.length)];
}

export function CaneAssistant() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const t = today();
  const todaySessions = useLiveQuery(() => db.sessions.where("date").equals(t).toArray(), [t]);
  const nextSessions = useLiveQuery(() => db.sessions.where("date").between(addDays(t, 1), addDays(t, 7), true, true).sortBy("date"), [t]);
  const logs7 = useLiveQuery(() => db.logs.where("date").between(addDays(t, -6), t, true, true).toArray(), [t]);
  const nextTest = useLiveQuery(() => db.goals.where("type").equals("test").toArray(), []);

  const ctx = useMemo(() => {
    const hour = new Date().getHours();
    const todayCount = todaySessions?.filter((s) => s.sport !== "mobilita").length ?? 0;
    const nextTitle = (todaySessions && todaySessions[0]?.title) || (nextSessions && nextSessions[0]?.title) || undefined;
    const daysDone = new Set((logs7 ?? []).filter((l) => l.status === "fatto" || l.status === "parziale").map((l) => l.date));
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      if (daysDone.has(addDays(t, -i))) streak++;
      else if (i > 0) break;
    }
    const futureTest = (nextTest ?? []).filter((g) => g.date && g.date >= t && !g.done).sort((a, b) => a.date!.localeCompare(b.date!))[0];
    const daysToTest = futureTest?.date ? Math.max(0, Math.round((new Date(futureTest.date).getTime() - new Date(t).getTime()) / 86400000)) : undefined;
    return { hour, todayCount, nextTitle, streak, daysToTest };
  }, [t, todaySessions, nextSessions, logs7, nextTest]);

  // Autodismiss after 10s when opened
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setOpen(false), 10000);
    return () => window.clearTimeout(id);
  }, [open, msg]);

  function toggle() {
    if (open) { setOpen(false); return; }
    setMsg(pickPhrase(ctx));
    setOpen(true);
  }

  return (
    <>
      {open && (
        <div className="cane-bubble" role="status" aria-live="polite">
          <button className="cane-close" onClick={() => setOpen(false)} aria-label="Chiudi">×</button>
          <span className="cane-name">Akela</span>
          {msg}
        </div>
      )}
      <button className="cane-fab" onClick={toggle} aria-label="Chiedi ad Akela" aria-expanded={open}>
        <AkelaFace />
      </button>
    </>
  );
}

// Cartoon face of Akela (German shepherd: tan body, black mask, pointed ears)
function AkelaFace() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="akela">
      <defs>
        <radialGradient id="ak-fur" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#E6B978"/>
          <stop offset="100%" stopColor="#C98F4F"/>
        </radialGradient>
      </defs>

      {/* Ears (behind head) */}
      <g className="ak-ear ak-ear-l">
        <path d="M18 42 Q14 14 32 20 L36 44 Z" fill="#2B2520"/>
        <path d="M23 38 Q22 24 31 25 L34 42 Z" fill="#E89AA6"/>
      </g>
      <g className="ak-ear ak-ear-r">
        <path d="M82 42 Q86 14 68 20 L64 44 Z" fill="#2B2520"/>
        <path d="M77 38 Q78 24 69 25 L66 42 Z" fill="#E89AA6"/>
      </g>

      {/* Head with subtle tilt */}
      <g className="ak-head">
        {/* Base fur */}
        <path d="M18 55 Q18 32 50 30 Q82 32 82 55 Q82 82 50 86 Q18 82 18 55 Z" fill="url(#ak-fur)"/>
        {/* Black mask (top of head + around eyes) */}
        <path d="M22 46 Q22 30 50 30 Q78 30 78 46 Q78 58 70 58 Q60 48 50 48 Q40 48 30 58 Q22 58 22 46 Z" fill="#2B2520"/>
        {/* Cream cheeks */}
        <path d="M24 62 Q24 70 32 72 Q36 68 36 62 Z" fill="#F0D7A8"/>
        <path d="M76 62 Q76 70 68 72 Q64 68 64 62 Z" fill="#F0D7A8"/>
        {/* Snout (lighter) */}
        <ellipse cx="50" cy="68" rx="16" ry="12" fill="#E8CA9A"/>
        {/* Black muzzle top (strip) */}
        <path d="M42 60 Q50 56 58 60 L58 66 Q50 64 42 66 Z" fill="#2B2520"/>

        {/* Eyes */}
        <g className="ak-eye ak-eye-l">
          <ellipse cx="38" cy="52" rx="4.2" ry="5" fill="#1a1612"/>
          <circle cx="37" cy="50" r="1.3" fill="#fff"/>
          <circle cx="39" cy="54" r="0.6" fill="#C98A3C"/>
        </g>
        <g className="ak-eye ak-eye-r">
          <ellipse cx="62" cy="52" rx="4.2" ry="5" fill="#1a1612"/>
          <circle cx="61" cy="50" r="1.3" fill="#fff"/>
          <circle cx="63" cy="54" r="0.6" fill="#C98A3C"/>
        </g>

        {/* Nose */}
        <ellipse cx="50" cy="64" rx="5" ry="3.4" fill="#141010"/>
        <ellipse cx="48.6" cy="63" rx="1" ry="0.7" fill="#4a3f36"/>

        {/* Mouth (upper line, split) */}
        <path d="M50 68 L50 72" stroke="#141010" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M50 72 Q45 76 40 74" stroke="#141010" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
        <path d="M50 72 Q55 76 60 74" stroke="#141010" strokeWidth="1.4" fill="none" strokeLinecap="round"/>

        {/* Tongue */}
        <g className="ak-tongue">
          <path d="M46 74 Q50 82 54 74 L54 76 Q50 83 46 76 Z" fill="#E88A9A"/>
          <path d="M50 74 L50 80" stroke="#C76A7D" strokeWidth="0.8" strokeLinecap="round"/>
        </g>
      </g>
    </svg>
  );
}
