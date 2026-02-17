# Deploy su Easypanel (template Directus + GitHub)

Guida per **punto 2** (configurazione template Directus) e **punto 3** (estensioni).

---

## 2. Configurazione template Directus

### Database

Il progetto usa **PostgreSQL con PostGIS**. Su Easypanel puoi:

- **Opzione A** – Usare il database del template Directus (PostgreSQL standard).  
  Se le tue collezioni non usano geometrie/PostGIS, va bene.
- **Opzione B** – Creare un servizio separato con immagine `postgis/postgis:17-3.5` e collegare Directus a quello (necessario se usi campi geografici).

### Variabili d’ambiente (Directus)

Impostale nella sezione **Environment** del servizio Directus su Easypanel.

| Variabile       | Obbligatoria | Descrizione |
|-----------------|--------------|-------------|
| `KEY`           | Sì           | Chiave segreta (es. stringa random lunga). Usata per cifratura. |
| `SECRET`        | Sì           | Altra chiave segreta (es. stringa random). Per token/sessioni. |
| `DB_CLIENT`     | Sì           | `pg` (PostgreSQL). |
| `DB_HOST`       | Sì           | Host del DB (es. `database` se servizio interno, o hostname del DB Easypanel). |
| `DB_PORT`       | Sì           | `5432`. |
| `DB_DATABASE`   | Sì           | Nome database. |
| `DB_USER`       | Sì           | Utente database. |
| `DB_PASSWORD`   | Sì           | Password database. |
| `PUBLIC_URL`    | Consigliata  | URL pubblico dell’app (es. `https://tuodominio.com/`). Per redirect, email, asset. |
| `ADMIN_EMAIL`   | Opzionale   | Email primo admin. |
| `ADMIN_PASSWORD`| Opzionale   | Password primo admin. |

Esempio minimo:

```env
KEY=una-chiave-molto-lunga-e-random
SECRET=un-altro-segreto-molto-lungo
DB_CLIENT=pg
DB_HOST=database
DB_PORT=5432
DB_DATABASE=directus
DB_USER=directus
DB_PASSWORD=password-sicura
PUBLIC_URL=https://directus.tuodominio.com/
```

### Volumi (persistenza)

- **Uploads** – Monta un volume su `/directus/uploads` (file caricati dagli utenti).  
  Su Easypanel: aggiungi un volume al servizio Directus, path container `/directus/uploads`.
- **Estensioni** – Non serve un volume: le estensioni sono incluse nell’immagine costruita dal Dockerfile (vedi punto 3).

### Ho già le cartelle Uploads e Extensions – come imposto su Directus?

Directus usa **sempre** questi path **dentro il container**:

| Cartella   | Path nel container   | Cosa ci va |
|-----------|----------------------|------------|
| **Uploads**   | `/directus/uploads`   | File caricati dagli utenti (immagini, allegati). |
| **Extensions**| `/directus/extensions` | Moduli/estensioni (con le sottocartelle `.registry/` e i `dist/` compilati). |

#### Uploads (cartella che hai già)

1. Su Easypanel apri il servizio **Directus**.
2. Vai in **Storage** / **Volumes** (o **Mounts**).
3. Aggiungi un volume:
   - **Container path**: `/directus/uploads` (esattamente così).
   - **Source**:  
     - Se la cartella è sul server: path della cartella (es. `/data/directus-uploads`).  
     - Oppure crea un **Volume** Easypanel e usalo come source (così i file restano anche se cancelli il container).
4. Salva e riavvia il servizio se serve.

Directus leggerà e scriverà i file in quella cartella tramite il path `/directus/uploads` nel container.

#### Extensions (cartella che hai già)

Due possibilità:

- **A) Uso le estensioni dal repo (consigliato)**  
  Con il Dockerfile di questo progetto le estensioni vengono **buildate** e messe nell’immagine in `/directus/extensions`.  
  **Non** montare nessun volume su `/directus/extensions`: usa quelle già presenti nell’immagine.

- **B) Voglio usare la mia cartella Extensions già pronta**  
  Se hai una cartella `extensions` (con `.registry/` e i `dist/` già compilati) e vuoi che Directus usi quella:
  1. Su Easypanel, nel servizio Directus, aggiungi un volume.
  2. **Container path**: `/directus/extensions`.
  3. **Source**: path della tua cartella `extensions` sul server (o un volume che la contiene).  
  Attenzione: montando qui **sovrascrivi** le estensioni nell’immagine. La cartella deve contenere le estensioni **già buildate** (con le sottocartelle `dist/`), altrimenti i moduli non si caricano.

### Dominio

- Imposta **PUBLIC_URL** uguale all’URL con cui accedi (es. dominio assegnato da Easypanel o il tuo dominio custom).
- Su Easypanel configura il **dominio** (o proxy) per il servizio Directus su quella URL.

### Porta

Directus in ascolto sulla porta **8055**. Su Easypanel assicurati che il servizio esponga quella porta (o che il proxy la mappi correttamente).

---

## 3. Far funzionare le estensioni

Le estensioni sono **moduli** che vanno **compilati** (`npm run build` → cartella `dist/`).  
Il Dockerfile del repo è impostato per:

1. Usare uno **stage di build** con Node: in ogni cartella sotto `extensions/.registry/` esegue `npm install` e `npm run build`.
2. Copiare nel container Directus solo il risultato (inclusi i `dist/`), senza `node_modules`, così l’immagine resta leggera e le estensioni funzionano a runtime.

### Cosa fare su Easypanel

- **Source**: GitHub → repository che contiene questa cartella (zwave-directus-github).
- **Build**: usa il **Dockerfile** nella root del repo (non il template “solo Directus” senza build).
- **Non** montare un volume su `/directus/extensions`: le estensioni devono essere quelle **costruite nell’immagine**.

Se Easypanel ti chiede “Dockerfile path”, lascia il default (es. `Dockerfile` nella root).

### Se una estensione non si carica

1. Controlla i log del servizio Directus (eventuali errori su modulo/extension).
2. Verifica che nel repo ci siano `package.json` e `src/` (e script `build`) per ogni modulo sotto `extensions/.registry/`.
3. Ricostruisci l’immagine dopo aver modificato il codice di un’estensione (push su GitHub e rebuild su Easypanel).

### Troubleshooting – errori dai log

| Errore | Causa | Cosa fare |
|--------|--------|------------|
| `Cannot find module '.../Chiamate Outbound/dist/api.js'` o `.../Visualizzazione Interfaccia/dist/index.js'` | I nomi delle cartelle contengono **spazi**; Node/Directus possono fallire su quei path. | Rinominare le cartelle senza spazi. Dalla root del repo esegui: `.\scripts\rename-extension-folders-no-spaces.ps1` (PowerShell). Poi push e rebuild immagine. |
| `Could not resolve "./extensions/.registry/.../dist/index.js"` o `Couldn't register bundle` | Le estensioni nel container **non hanno** le cartelle `dist/` (build mancante). | **Non** montare un volume su `/directus/extensions`. Usa l’immagine costruita con il **Dockerfile** del repo (che fa la build delle estensioni). Se stai montando la cartella del repo, rimuovi quel volume e fai rebuild dall’immagine. |
| `"PUBLIC_URL" should be a full URL` | `PUBLIC_URL` è vuota o non è un URL completo. | Imposta una variabile `PUBLIC_URL` con URL completo, es. `https://directus.tuodominio.com/`. |
| `PostGIS isn't installed. Geometry type support will be limited.` | Il DB non ha PostGIS (opzionale). | Ignora se non usi campi geografici. Altrimenti usa un’immagine PostGIS per il database. |

### Build locale (opzionale)

Per testare la stessa immagine in locale:

```bash
docker build -t directus-custom .
```

Poi avvia con `docker-compose` (o con le stesse env/volumi che usi su Easypanel).

---

## 4. Popolare il database con un dump

Se hai un dump del vecchio database PostgreSQL e vuoi usarlo sul servizio **directus_db** su Easypanel:

### 4.1 Encoding del dump (UTF-8)

PostgreSQL e `psql` si aspettano un file in **UTF-8**. Se il dump è in UTF-16 (es. esportato da uno strumento Windows), convertilo prima:

- **PowerShell (Windows):**
  ```powershell
  Get-Content -Path dump.sql -Encoding Unicode | Set-Content -Path dump_utf8.sql -Encoding UTF8
  ```
- **Linux/macOS:** `iconv -f UTF-16 -t UTF-8 dump.sql > dump_utf8.sql`

Usa il file risultante (`dump_utf8.sql`) per l’import.

### 4.1b Errore "backslash commands are restricted" (PostgreSQL 15+)

Se con `psql -f /tmp/dump.sql` compaiono molti errori tipo:

```text
psql:/tmp/dump.sql:23007: error: backslash commands are restricted; only \unrestrict is allowed
```

è perché da PostgreSQL 15 in poi `psql` esegue i file in modalità **restricted** e blocca i comandi backslash (`\connect`, `\copy`, ecc.) presenti nel dump.

**Soluzione:** aggiungi come **prima riga** del file di dump la riga:

```text
\unrestrict
```

Così psql consente tutti i comandi backslash per quel file.

- **Sul server (Linux), prima di importare:**
  ```bash
  sed -i '1i\\unrestrict' /tmp/dump.sql
  ```
  Poi: `psql -U <DB_USER> -d <DB_DATABASE> -f /tmp/dump.sql`

- **In locale (PowerShell), prima di copiare il dump sul server:**
  ```powershell
  $c = Get-Content -Path dump_utf8.sql -Raw
  Set-Content -Path dump_utf8.sql -Value "\unrestrict`n$c" -Encoding UTF8
  ```

### 4.2 Portare il dump sul server

- Copia il file sul server (es. con SCP/SFTP) in una cartella accessibile, oppure
- **Da macchina con Docker:** se hai accesso SSH al server Easypanel e Docker, puoi copiare il dump dentro il container del DB:
  ```bash
  # Sul server, trova il nome del container del DB (es. dal progetto Easypanel)
  docker ps
  docker cp /path/sul/server/dump_utf8.sql <nome_container_directus_db>:/tmp/dump.sql
  ```
  Poi dalla Shell del container **directus_db** su Easypanel: `psql -U <DB_USER> -d <DB_DATABASE> -f /tmp/dump.sql`.

### 4.3 Importare il dump nel servizio directus_db

1. **Ferma il servizio Directus** (così non scrive nel DB durante l’import). Su Easypanel: Stop del servizio Directus.

2. **Accedi al container del database**  
   Su Easypanel apri il servizio **directus_db** (PostgreSQL) e usa **Shell** / **Terminal** / **Execute** per entrare nel container.

3. **Se il database è già stato usato da Directus** (tabelle create al primo avvio), hai due strade:
   - **Sostituire tutto con il dump (consigliato):**  
     Dalla shell del container (o da un client `psql` che si connette al servizio):
     ```bash
     psql -U <DB_USER> -d postgres -c "DROP DATABASE IF EXISTS <DB_DATABASE>;"
     psql -U <DB_USER> -d postgres -c "CREATE DATABASE <DB_DATABASE> OWNER <DB_USER>;"
     ```
     Sostituisci `<DB_USER>` e `<DB_DATABASE>` con i valori che hai in **Environment** del servizio Directus (es. `DB_USER=directus`, `DB_DATABASE=directus`).

   - **Import in un DB vuoto:**  
     Se il template ha creato solo un database vuoto e Directus non è mai partito, puoi importare direttamente in quel database.

4. **Eseguire l’import**
   - **Se il dump è sul server** (path es. `/data/dump_utf8.sql`):
     - Monta temporaneamente quella cartella nel container **directus_db** (Mount path es. `/import`) e riavvia il servizio DB, oppure
     - Da un altro container/PC con `psql` e accesso alla rete del DB:
       ```bash
       PGPASSWORD=<DB_PASSWORD> psql -h <host_directus_db> -p 5432 -U <DB_USER> -d <DB_DATABASE> -f /path/to/dump_utf8.sql
       ```
   - **Dalla shell del container directus_db** (se il file è stato copiato dentro, es. in `/import/dump_utf8.sql`):
     ```bash
     psql -U <DB_USER> -d <DB_DATABASE> -f /import/dump_utf8.sql
     ```
   - **Da stdin** (copia/incolla non consigliato per file grandi):
     ```bash
     psql -U <DB_USER> -d <DB_DATABASE> < /import/dump_utf8.sql
     ```

5. **Riavvia il servizio Directus**  
   Su Easypanel: Avvia di nuovo il servizio Directus. Verifica che KEY e SECRET siano quelli che vuoi usare (se nel dump c’erano altri utenti/sessioni, le sessioni vecchie non saranno più valide; l’accesso con gli utenti del dump dovrebbe funzionare).

### 4.4 Verifica

- Apri l’URL di Directus e fai login con un utente presente nel dump.
- Controlla che collezioni e dati siano quelli attesi.

---

## Riepilogo checklist Easypanel

- [ ] App creata da **GitHub** (repo con questo progetto).
- [ ] Build da **Dockerfile** nella root (non solo immagine `directus/directus`).
- [ ] Variabili **KEY**, **SECRET**, **DB_*** e **PUBLIC_URL** impostate.
- [ ] Volume su **/directus/uploads** per i file caricati.
- [ ] **Nessun** volume su `/directus/extensions`.
- [ ] Dominio / **PUBLIC_URL** coerenti con l’URL di accesso.
- [ ] (Opzionale) Database popolato con il dump: Directus fermato → import in **directus_db** → Directus riavviato.
