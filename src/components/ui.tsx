import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Sport } from "../data/types";
import { SPORT_LABEL } from "../data/types";

export const SPORT_COLOR: Record<Sport | "altro", string> = {
  corsa: "var(--run)",
  bici: "var(--bike)",
  nuoto: "var(--swim)",
  forza: "var(--str)",
  mobilita: "var(--mob)",
  altro: "var(--mob)",
};

export function SportChip({ sport }: { sport: Sport | "altro" }) {
  return (
    <span className="chip" style={{ ["--c" as string]: SPORT_COLOR[sport] }}>
      {sport === "altro" ? "Altro" : SPORT_LABEL[sport]}
    </span>
  );
}

const ToastCtx = createContext<(msg: string) => void>(() => {});
export function useToast() {
  return useContext(ToastCtx);
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  );
}

type IconName = "today" | "week" | "programs" | "log" | "goals" | "gear" | "left" | "right" | "sync" | "plus";
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "today":
      return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "week":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "programs":
      return <svg {...p}><path d="M4 6h16M4 12h16M4 18h10" /></svg>;
    case "log":
      return <svg {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;
    case "goals":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
    case "gear":
      return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
    case "left":
      return <svg {...p}><path d="M15 18l-6-6 6-6" /></svg>;
    case "right":
      return <svg {...p}><path d="M9 18l6-6-6-6" /></svg>;
    case "sync":
      return <svg {...p}><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M3 21v-5h5" /></svg>;
    case "plus":
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
  }
}

export function fmtMin(m?: number): string {
  if (!m) return "";
  const h = Math.floor(m / 60);
  return h ? `${h}h${String(m % 60).padStart(2, "0")}` : `${m}'`;
}

export function fmtKm(k?: number): string {
  if (!k) return "";
  return `${k.toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}
