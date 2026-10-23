# Allenamenti

App personale per corsa, bici, nuoto e forza: programmi, calendario, registro, obiettivi e importazione da Strava.
È una PWA: si apre dal browser e si installa sulla schermata Home del telefono. Funziona anche offline.

## Cosa c'è dentro

- **Oggi**: le sedute del giorno, con i pulsanti Fatta / Parziale / Saltata, dettagli (minuti, km, battiti, fatica, note) e "Sposta" per cambiare giorno. In alto il conto alla rovescia per il prossimo test e le gare.
- **Settimana**: la settimana dal lunedì alla domenica, con sedute fatte, km di corsa e tempo in bici.
- **Programmi**: Verso i 10 km, Bici del weekend, Corso di nuoto, Forza (con le schede esercizi), Recupero del lunedì. Si possono aggiungere sedute extra.
- **Registro**: tutto quello che hai fatto, comprese le attività Strava.
- **Obiettivi**: gare con giorni mancanti, record sui segmenti, test e peso.
- **Impostazioni** (⚙︎): collegamento Strava, backup e ripristino dei dati, ripristino dei programmi.

I dati restano nel telefono (IndexedDB). Dalle impostazioni si scarica un backup JSON.

## Metterla online (una volta sola, circa 15 minuti)

### 1. GitHub
Il codice va nel repository `SAMUCANE/allenamenti`.

### 2. Vercel
1. Vai su https://vercel.com e accedi con GitHub.
2. **Add New → Project**, scegli il repository `allenamenti` e premi **Deploy** (Vercel riconosce Vite da solo).
3. Alla fine hai un indirizzo tipo `https://allenamenti-xxx.vercel.app`.

### 3. Strava
1. Vai su https://www.strava.com/settings/api e crea un'applicazione:
   - *Application Name*: Allenamenti
   - *Category*: Training
   - *Website*: l'indirizzo Vercel
   - *Authorization Callback Domain*: solo il dominio, es. `allenamenti-xxx.vercel.app`
2. Copia **Client ID** e **Client Secret**.
3. Su Vercel: **Project → Settings → Environment Variables**, aggiungi:
   - `STRAVA_CLIENT_ID` = il Client ID
   - `STRAVA_CLIENT_SECRET` = il Client Secret
   - `STRAVA_ATHLETE_ID` = il tuo ID atleta Strava (facoltativo: blocca l'app al solo tuo account; è il numero nell'indirizzo del tuo profilo, es. 166626711)
4. **Deployments → ⋯ → Redeploy** per applicare le variabili.

### 4. Sul telefono
Apri l'indirizzo Vercel in Safari → **Condividi → Aggiungi alla schermata Home**. Poi ⚙︎ → **Collega Strava** → **Sincronizza**.

## Sviluppo

```bash
npm install
npm run dev      # app in locale (senza Strava)
npm run build    # build di produzione
```

Le funzioni in `api/strava/` girano su Vercel: scambiano i codici di Strava con il client secret, che non arriva mai nel telefono.

Per cambiare i programmi precaricati modifica `src/data/seed.ts` e aumenta `SEED_VERSION` in `src/data/db.ts`: programmi e sedute vengono riscritti, registro e Strava restano.
