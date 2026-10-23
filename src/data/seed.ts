import type { Goal, PlannedSession, Program, WeightEntry } from "./types";
import { addDays, parse } from "./dates";

// ---------- Programma corsa: Verso i 10 km (26 settimane, mar + dom) ----------
// [settimana, fase, etichetta, mar titolo, mar dettaglio, dom titolo, dom dettaglio, km settimana, test]
type W = [number, number, string, string, string, string, string, number, 0 | 1 | 2];
const RUN: W[] = [
  [1, 1, "", "Facile + allunghi", "30' a 9,5–10 km/h, poi 4 × 20\" a 13 km/h con 40\" a 8,5", "6 km facili", "9,5–10 km/h o all'aperto", 11, 0],
  [2, 1, "", "Facile + allunghi", "35' a 9,5–10 km/h, poi 6 × 20\" a 13", "6,5 km facili", "Battiti 140–150", 12.5, 0],
  [3, 1, "", "Fartlek", "Riscaldamento, 6 × (1' a 12 + 1' a 9), defaticamento", "7 km facili", "Battiti 140–150", 12.5, 0],
  [4, 1, "Scarico", "Facile + allunghi", "25' a 9,5, poi 4 × 20\" a 13", "5 km facili", "Rilassato", 9.5, 0],
  [5, 1, "", "Fartlek", "Riscaldamento, 8 × (1' a 12 + 1' a 9), defaticamento", "7,5 km facili", "Battiti 140–150", 13.5, 0],
  [6, 1, "", "Ritmo medio", "Riscaldamento, 3 × 5' a 11 km/h (rec. 2' a 9), defaticamento", "8 km facili", "Battiti 140–150", 14.5, 0],
  [7, 1, "", "Ritmo medio", "Riscaldamento, 2 × 10' a 11 km/h (rec. 3' a 9), defaticamento", "8,5 km facili", "Battiti 140–150", 15.5, 0],
  [8, 1, "Test", "TEST 5 km", "Riscaldamento + 4 allunghi, poi 5 km al massimo che puoi tenere costante. Parti a 11 e alza ogni km se stai bene", "6 km facili", "Recupero dal test", 13.5, 1],
  [9, 1, "Natale · scarico", "Facile libero", "35' a 9,5–10, come ti senti", "8 km facili", "All'aperto se c'è il sole", 13.5, 0],
  [10, 2, "", "Soglia", "Riscaldamento, 3 × 6' a 11,5 (rec. 2' a 9), defaticamento", "9 km facili", "Battiti 140–150", 15.5, 0],
  [11, 2, "", "Intervalli", "Riscaldamento, 5 × 3' a 12,5 (rec. 2' a 8,5), defaticamento", "9 km", "Ultimi 2 km a 11 km/h", 15.5, 0],
  [12, 2, "Scarico", "Facile + allunghi", "30' a 9,5, poi 6 × 20\" a 13", "7 km facili", "Rilassato", 12, 0],
  [13, 2, "Prima volta 10 km", "Soglia", "Riscaldamento, 3 × 8' a 11,5 (rec. 2'), defaticamento", "10 km facili", "Il traguardo della fase: solo battiti sotto 150", 16.5, 0],
  [14, 2, "", "Intervalli", "Riscaldamento, 6 × 3' a 12,5–13 (rec. 2'), defaticamento", "10,5 km", "Ultimi 3 km a 11 km/h", 17, 0],
  [15, 2, "", "Soglia continua", "Riscaldamento, 20' continui a 11,5, defaticamento", "11 km facili", "Battiti 140–150", 17.5, 0],
  [16, 2, "Test · scarico", "TEST 5 km", "Come la settimana 8: confronta il tempo e aggiorna le zone", "8 km facili", "Recupero", 14, 1],
  [17, 2, "", "Soglia lunga", "Riscaldamento, 2 × 12' a 11,5–12 (rec. 3'), defaticamento", "11,5 km", "Ultimi 3 km a ritmo 10 km", 18, 0],
  [18, 3, "", "Ritmo 10 km", "Riscaldamento, 5 × 1 km a ritmo 10 km (circa 11,5) con 90\" a 8,5", "12 km facili", "Battiti 140–150", 19, 0],
  [19, 3, "", "Intervalli", "Riscaldamento, 6 × 800 m a 13 (rec. 2'), defaticamento", "12 km", "Ultimi 4 km a 11 km/h", 19.5, 0],
  [20, 3, "Scarico", "Ritmo 10 km breve", "Riscaldamento, 4 × 1 km a ritmo 10 km (rec. 90\")", "8 km facili", "Rilassato", 14, 0],
  [21, 3, "", "Ritmo 10 km", "Riscaldamento, 3 × 2 km a ritmo 10 km (rec. 2')", "12 km facili", "Battiti 140–150", 20, 0],
  [22, 3, "Pasqua", "Ritmo 10 km lungo", "Riscaldamento, 2 × 3 km a ritmo 10 km (rec. 3')", "10 km progressivi", "4 km facili + 4 km a 11 + 2 km a ritmo 10 km", 18.5, 0],
  [23, 3, "", "Velocità", "Riscaldamento, 5 × 1 km a 12 (più veloce del ritmo gara, rec. 2')", "12 km facili", "Battiti 140–150", 19.5, 0],
  [24, 4, "Scarico", "Richiamo", "Riscaldamento, 3 × 1 km a ritmo 10 km", "8 km facili", "Rilassato", 13, 0],
  [25, 4, "Test", "Attivazione", "30' a 9,5 + 4 allunghi a 13", "TEST 10 km", "All'aperto, strada piatta. Primi 2 km prudenti, poi costante, ultimi 2 a tutta. Obiettivo 53–55'", 14.5, 2],
  [26, 4, "Settimana di gara", "Sblocco", "20' facili + 3 × 1' a ritmo gara", "Sprint di Chiusi", "Se la gara è a fine aprile. Se no, 8 km facili", 9, 0],
];

const RUN_START = "2026-10-26";

function runSessions(): PlannedSession[] {
  const out: PlannedSession[] = [];
  for (const w of RUN) {
    const [n, , tag, qt, qd, lt, ld, , test] = w;
    const mon = addDays(RUN_START, (n - 1) * 7);
    const tue = addDays(mon, 1);
    const sun = addDays(mon, 6);
    const qKind = test === 1 ? "test" : "qualita";
    out.push({
      id: `run-${n}-q`, programId: "run10k", date: tue, sport: "corsa", kind: qKind, week: n,
      title: qt, detail: qd + (tag ? ` · ${tag}` : ""),
      target: test === 1 ? "Al massimo sostenibile" : "Riscaldamento 10' · defaticamento 5' a 8 km/h",
    });
    const lastWeek = n === 26;
    out.push({
      id: `run-${n}-l`, programId: "run10k", date: sun, sport: "corsa",
      kind: test === 2 ? "test" : lastWeek ? "gara" : "lunga", week: n,
      title: lt, detail: ld, target: test === 2 ? "53–55'" : "Battiti 140–150, sempre facile", km: parseFloat(lt.replace(",", ".")) || undefined,
    });
  }
  return out;
}

// ---------- Bici del weekend: un'uscita il sabato ----------
function bikeSessions(): PlannedSession[] {
  const out: PlannedSession[] = [];
  let d = "2026-10-31";
  let i = 1;
  while (d <= "2027-05-29") {
    const m = parse(d).getMonth(); // 0 = gen
    let title = "Uscita lunga";
    let detail = "2h facili in pianura e collina";
    let target = "Primi 8 km sotto 140 · poi 145–152 · salite con tetto a 160";
    if (m === 0 || m === 1) {
      detail = "2h15–2h30 con qualche salita breve";
    } else if (m === 2) {
      title = "Uscita lunga con salite";
      detail = "2h30 · 2 salite lunghe da 20' a 150–158 (Scopetone, Scheggia) · 10' di corsa facile appena scendi";
    } else if (m === 3) {
      title = "Uscita lunga con salite";
      detail = "2h30–3h · 1.000–1.500 m di dislivello · 10' di corsa facile appena scendi";
    } else if (m === 4) {
      title = "Lunga di montagna";
      detail = "3h30–4h · 1.500–2.000 m (Casentino, Pratomagno): prova generale del Sella Ronda";
    }
    if (d === "2027-04-24") {
      title = "Bici facile pre-gara";
      detail = "1h agile con 3 accelerazioni da 1'";
      target = "Sotto 145";
    }
    out.push({ id: `bike-${i}`, programId: "bike", date: d, sport: "bici", kind: "lunga", title, detail, target });
    d = addDays(d, 7);
    i++;
  }
  out.push({
    id: "bike-sella", programId: "bike", date: "2027-06-05", sport: "bici", kind: "gara",
    title: "Sella Ronda Bike Day", detail: "60 km, circa 2.000 m: Sella, Pordoi, Campolongo, Gardena. Partenza da Selva",
    target: "Primi 4 km del Sella sotto 145 · salite a 150–155",
  });
  return out;
}

// ---------- Nuoto: corso del giovedì ----------
function swimSessions(): PlannedSession[] {
  const out: PlannedSession[] = [];
  let d = "2026-11-05";
  let i = 1;
  while (d <= "2027-04-22") {
    const detail =
      i <= 4
        ? "Corso: respirazione e posizione del corpo. Niente cronometro, ascolta l'istruttore"
        : i <= 12
          ? "Corso: tecnica della bracciata e virate. Annota quante vasche fai senza fermarti"
          : "Corso + 10' extra di nuoto continuo, verso i 750 m senza soste";
    out.push({ id: `swim-${i}`, programId: "swim", date: d, sport: "nuoto", kind: "tecnica", title: "Corso di nuoto", detail });
    d = addDays(d, 7);
    i++;
  }
  return out;
}

// ---------- Forza: mercoledì ----------
function strengthSessions(): PlannedSession[] {
  const out: PlannedSession[] = [];
  let d = "2026-10-28";
  let i = 1;
  while (d <= "2027-04-21") {
    const deload = d >= "2027-04-12";
    out.push({
      id: `str-${i}`, programId: "forza", date: d, sport: "forza", kind: "forza",
      title: deload ? "Forza leggera (Parte A)" : "Forza: Parte A + Parte B",
      detail: deload ? "Solo busto e core, niente gambe pesanti prima di test e gara" : "Busto e core (A), poi gambe da endurance (B). Carichi medi, 2–3 ripetizioni di margine",
    });
    d = addDays(d, 7);
    i++;
  }
  return out;
}

// ---------- Mobilità: lunedì ----------
function mobilitySessions(): PlannedSession[] {
  const out: PlannedSession[] = [];
  let d = "2026-10-26";
  let i = 1;
  while (d <= "2027-04-19") {
    out.push({ id: `mob-${i}`, programId: "mobilita", date: d, sport: "mobilita", kind: "recupero", title: "Mobilità e riposo", detail: "15': caviglie, anche, schiena. Recupero dal weekend" });
    d = addDays(d, 7);
    i++;
  }
  return out;
}

export const PROGRAMS: Program[] = [
  {
    id: "run10k", name: "Verso i 10 km", sport: "corsa", color: "--run", start: RUN_START, end: "2027-04-25",
    description: "26 settimane, 2 corse a settimana: martedì qualità sul tapis roulant, domenica lunga facile. Dai 5 km di oggi a 10 km in 53–55' ad aprile.",
    notes: [
      "Zone · R recupero 8–8,5 km/h (<135) · E facile 9,5–10 km/h (140–150) · M medio 10,5–11 km/h (150–157) · T soglia 11,5 km/h (157–163) · I intervalli 12,5–13 km/h (165–172)",
      "80/20: almeno l'80% della corsa in zona facile",
      "Mai più del 10% in più a settimana sulla lunga; ogni quarta settimana si scarica",
      "Dolore localizzato per più di 2 giorni: ripeti la settimana precedente",
      "Tapis roulant sempre all'1% di pendenza; dopo ogni test aggiorna i ritmi",
    ],
  },
  {
    id: "bike", name: "Bici del weekend", sport: "bici", color: "--bike", start: "2026-10-31", end: "2027-06-05",
    description: "Un'uscita a settimana, il sabato (o la domenica se piove). Inverno di base, salite da marzo, prova generale a maggio, Sella Ronda il 5 giugno.",
    notes: [
      "Sempre: primi 8 km sotto 140 battiti, niente rilanci in paese",
      "Ultimi 3 km sotto 135, cadenza alta",
      "In salita resta seduto e scala un dente prima di superare il tetto",
    ],
  },
  {
    id: "swim", name: "Corso di nuoto", sport: "nuoto", color: "--swim", start: "2026-11-05", end: "2027-04-22",
    description: "Corso del giovedì da novembre. Obiettivo: 750 m continui in acque libere con la muta entro aprile.",
    notes: [
      "Il primo mese niente cronometro: respirazione e galleggiamento",
      "Da gennaio, se riesci, un secondo nuoto nel weekend in vasca libera",
      "Certificato medico: non agonistico per il corso, agonistico prima delle gare FITRI",
    ],
  },
  {
    id: "forza", name: "Forza per corsa e bici", sport: "forza", color: "--str", start: "2026-10-28", end: "2027-04-21",
    description: "Il mercoledì, a 72 ore dalla bici. Parte A busto e core, Parte B gambe da endurance.",
    notes: ["Mai gambe pesanti il giorno prima di ripetute, test o gare", "Core: aggiungi un giro alla volta fino a 3"],
    sheets: [
      {
        title: "Parte A · busto", subtitle: "Petto e schiena: 3 serie, recupero 1'30\"",
        rows: [
          { name: "Panca piana con manubri", dose: "3 × 8–10" },
          { name: "Panca inclinata con manubri", dose: "3 × 10" },
          { name: "Rematore con manubrio a un braccio", dose: "3 × 10 per lato", why: "Spalle aperte dopo ore sul manubrio" },
          { name: "Croci inverse a busto flesso", dose: "3 × 12–15", why: "Postura in bici e bracciata" },
          { name: "Croci con manubri", dose: "2 × 12" },
        ],
      },
      {
        title: "Parte A · core", subtitle: "Circuito, 3 giri, 1' tra i giri",
        rows: [
          { name: "Plank sugli avambracci", dose: "40\"" },
          { name: "Plank con tocco della spalla", dose: "10 per lato", why: "Stabilità contro le rotazioni" },
          { name: "Plank laterale", dose: "25\" per lato" },
          { name: "Dead bug", dose: "10 per lato" },
          { name: "Bird dog", dose: "8 per lato, 2\" ferme" },
          { name: "Superman", dose: "12, 2\" ferme" },
          { name: "Hollow hold", dose: "20\"" },
        ],
      },
      {
        title: "Parte B · gambe", subtitle: "3 serie, carichi medi",
        rows: [
          { name: "Affondi bulgari", dose: "3 × 8 per gamba", why: "Forza su una gamba sola" },
          { name: "Stacco rumeno su una gamba", dose: "3 × 8 per gamba", why: "Femorali e glutei, equilibrio" },
          { name: "Ponte glutei", dose: "3 × 12 (poi su una gamba)" },
          { name: "Step-up su panca", dose: "3 × 10 per gamba" },
          { name: "Mostro laterale con elastico", dose: "3 × 12 passi per lato", why: "Ginocchio dritto in corsa" },
          { name: "Calf raise su una gamba", dose: "3 × 12, discesa in 3\"", why: "Polpacci e tendine d'Achille" },
          { name: "Tibiale anteriore al muro", dose: "2 × 20", why: "Previene il dolore alle tibie" },
        ],
      },
      {
        title: "Mobilità pre-corsa", subtitle: "8 minuti, prima di ogni corsa",
        rows: [
          { name: "Circonduzioni caviglie", dose: "10 per lato" },
          { name: "Calf raise", dose: "15 lenti" },
          { name: "Slanci avanti-indietro", dose: "12 per gamba" },
          { name: "Slanci laterali", dose: "12 per gamba" },
          { name: "Affondi camminati con rotazione", dose: "6 per lato" },
          { name: "Ginocchio al petto camminando", dose: "8 per lato" },
          { name: "Tallone al gluteo camminando", dose: "8 per lato" },
          { name: "Skip basso sul posto", dose: "2 × 15\"" },
        ],
      },
    ],
  },
  {
    id: "mobilita", name: "Recupero del lunedì", sport: "mobilita", color: "--mob", start: "2026-10-26", end: "2027-04-19",
    description: "Lunedì di riposo attivo dopo il weekend: 15' di mobilità.",
  },
];

export function buildSessions(): PlannedSession[] {
  return [...runSessions(), ...bikeSessions(), ...swimSessions(), ...strengthSessions(), ...mobilitySessions()];
}

export const GOALS: Goal[] = [
  { id: "g-chiusi", type: "gara", title: "Triathlon Sprint del Lago di Chiusi", date: "2027-04-25", dateNote: "Data da confermare: nel 2026 si è corsa a luglio", target: "1h25–1h35", detail: "750 m nuoto · 20 km bici · 5 km corsa" },
  { id: "g-sella", type: "gara", title: "Sella Ronda Bike Day", date: "2027-06-05", target: "Giro completo in circa 3h30", detail: "60 km, circa 2.000 m · Sella, Pordoi, Campolongo, Gardena" },
  { id: "g-olimpico", type: "gara", title: "Triathlon olimpico", dateNote: "2027, gara da scegliere", target: "Sotto le 3 ore", detail: "1,5 km nuoto · 40 km bici · 10 km corsa" },
  { id: "r-scop", type: "record", title: "Scopetone", current: "15:51 (17/8)", target: "15:40 ora · sotto 15:00 in primavera", detail: "3,6 km · +215 m · attacco a 137–139 battiti" },
  { id: "r-sanfab", type: "record", title: "San Fabiano da Antria", current: "8:38 (24/9)", target: "8:25–8:30", detail: "3,4 km · incrocio di Antria sotto 152" },
  { id: "r-firmina", type: "record", title: "Salita Santa Firmina", current: "1:12 (23/9), 2° in classifica", target: "Sotto 1:10", detail: "515 m" },
  { id: "t-5k-1", type: "test", title: "Test 5 km (tapis roulant)", date: "2026-12-15", current: "29:05 dopo la bici (19/10)", target: "Sotto 27:00" },
  { id: "t-5k-2", type: "test", title: "Test 5 km (tapis roulant)", date: "2027-02-09", target: "Migliorare il test di dicembre" },
  { id: "t-10k", type: "test", title: "Test 10 km su strada", date: "2027-04-18", target: "53–55'" },
  { id: "w", type: "peso", title: "Peso", current: "85 kg", target: "77–78 kg" },
];

export const WEIGHTS: WeightEntry[] = [{ date: "2026-10-23", kg: 85 }];
