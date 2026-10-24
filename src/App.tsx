import { HashRouter, Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Today } from "./screens/Today";
import { Week } from "./screens/Week";
import { ProgramDetail, Programs } from "./screens/Programs";
import { Log } from "./screens/Log";
import { Goals } from "./screens/Goals";
import { Settings } from "./screens/Settings";
import { Icon, ToastProvider } from "./components/ui";
import { CaneAssistant } from "./components/CaneAssistant";
import { long, today } from "./data/dates";

const TITLES: Record<string, string> = {
  "/": "Oggi",
  "/settimana": "Settimana",
  "/programmi": "Programmi",
  "/registro": "Registro",
  "/obiettivi": "Obiettivi",
  "/impostazioni": "Impostazioni",
};

function Header() {
  const { pathname } = useLocation();
  const base = "/" + (pathname.split("/")[1] ?? "");
  const title = TITLES[base] ?? "Allenamenti";
  return (
    <header className="top">
      <div>
        <h1>{title}</h1>
        {base === "/" && <div className="sub">{long(today())}</div>}
      </div>
      {base !== "/impostazioni" && (
        <Link to="/impostazioni" className="iconbtn" aria-label="Impostazioni" style={{ color: "inherit" }}><Icon name="gear" size={20} /></Link>
      )}
    </header>
  );
}

const TABS: { to: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { to: "/", label: "Oggi", icon: "today" },
  { to: "/settimana", label: "Settimana", icon: "week" },
  { to: "/programmi", label: "Programmi", icon: "programs" },
  { to: "/registro", label: "Registro", icon: "log" },
  { to: "/obiettivi", label: "Obiettivi", icon: "goals" },
];

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <div className="app">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/settimana" element={<Week />} />
              <Route path="/programmi" element={<Programs />} />
              <Route path="/programmi/:id" element={<ProgramDetail />} />
              <Route path="/registro" element={<Log />} />
              <Route path="/obiettivi" element={<Goals />} />
              <Route path="/impostazioni" element={<Settings />} />
              <Route path="*" element={<Today />} />
            </Routes>
          </main>
          <CaneAssistant />
          <nav className="nav" aria-label="Sezioni">
            <ul>
              {TABS.map((t) => (
                <li key={t.to}>
                  <NavLink to={t.to} end={t.to === "/"}>
                    <span className="ico-wrap"><Icon name={t.icon} size={18} /></span>
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </ToastProvider>
    </HashRouter>
  );
}
