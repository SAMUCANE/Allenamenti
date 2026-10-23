# Allenamenti: note per Claude

App personale di Samuele (PWA, React + TypeScript + Vite) per seguire i programmi di corsa, bici, nuoto e forza verso il triathlon 2027. Pubblicata su Vercel dal repository GitHub `SAMUCANE/allenamenti`: ogni push su `main` si pubblica da solo.

## Struttura
- `src/data/seed.ts`: programmi precaricati (Verso i 10 km, Bici del weekend, Corso di nuoto, Forza, Recupero), sedute, obiettivi. Dopo ogni modifica aumenta `SEED_VERSION` in `src/data/db.ts`.
- `src/data/db.ts`: database locale IndexedDB (Dexie), backup e ripristino.
- `src/data/strava.ts` + `api/strava/*`: collegamento Strava (OAuth sulle funzioni serverless di Vercel, variabili `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_ATHLETE_ID`).
- `src/screens/`: Oggi, Settimana, Programmi, Registro, Obiettivi, Impostazioni.

## Convenzioni
- Interfaccia e testi in italiano, tono diretto e informale.
- Date sempre come stringhe locali `YYYY-MM-DD` (helper in `src/data/dates.ts`).
- Mobile first: va provata a 390 px di larghezza, in tema chiaro e scuro.
- Nei piani bici: sempre il limite di circa 140 battiti nei primi 8 km.
- Prima di consegnare: `npx tsc -b && npm run build` senza errori.
