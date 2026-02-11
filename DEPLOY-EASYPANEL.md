# Deploy su Easypanel con sorgente GitHub

Guida per collegare questa repo a Easypanel e avere tutto funzionante online.

---

## 0. Già online? Aggiungere la repo GitHub senza rompere nulla

Se hai **già** un deploy Easypanel funzionante (Directus + DB su Hostinger o altro) e vuoi solo **aggiungere questa repo GitHub come sorgente** (per auto-deploy o per usare il `docker-compose.yml` da Git):

1. **Backup preventivo (consigliato)**  
   - In Easypanel: esporta le variabili d’ambiente del progetto (copia-incolla in un file locale sul tuo PC, non in questo file).  


*(Non inserire qui le tue variabili: contengono segreti. Tienile solo in Easypanel o in un file locale sul tuo PC.)*



   - Se usi volumi: assicurati che i dati (DB, uploads) siano su volumi gestiti da Easypanel (non si perdono cambiando sorgente).

2. **Collega GitHub a Easypanel** (vedi sotto): Settings → Github con token **oppure** Deploy key sulla repo.

3. **Cambiare la sorgente dell’app/compose**  
   - Apri il **Compose** (o l’App) già esistente in Easypanel.  
   - Vai in **Source** (o **Source Code**).  
   - Se prima era “Image” o “Upload”: aggiungi come **seconda** opzione la sorgente **Git**.  
   - Imposta **Repository URL** = `https://github.com/TUO-USERNAME/ZWave-Directus-Github.git` (o SSH se usi Deploy key).  
   - **Branch:** `main` (o il tuo branch).  
   - **Non** fare ancora “Redeploy” se non vuoi applicare subito le modifiche.

4. **Cosa succede quando fai “Redeploy”**  
   - Easypanel clona la repo e usa il `docker-compose.yml` dalla repo.  
   - I **volumi** già creati (es. `postgres_data`, `./uploads`) restano; i container vengono ricreati con le immagini/versioni definite nel compose.  
   - Le **variabili d’ambiente** restano quelle già impostate in Easypanel; verifica che corrispondano a `.env.example` (nomi come `DB_USER`, `KEY`, `SECRET`, ecc.).

5. **Per non cambiare nulla subito**  
   - Puoi solo **salvare** la configurazione con la nuova sorgente Git e fare redeploy in un secondo momento, quando sei pronto.  
   - In alternativa crea un **nuovo** Compose project che punta alla repo GitHub, verifica che funzioni, e solo dopo migrare dominio/dati se serve.

**Hostinger:** se Easypanel gira su Hostinger, il comportamento è lo stesso; l’importante è che le env e i volumi siano già configurati nel pannello Easypanel.

---

## 1. Aggiungere la repo GitHub in Easypanel

### Opzione A – GitHub API (consigliata per auto-deploy)

1. **Crea un Personal Access Token su GitHub**
   - Vai su [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens).
   - **Classic token:** permessi `repo` e `admin:repo_hook` (per webhook auto-deploy).
   - **Fine-grained:** permessi su questa repo: **Contents** (read), **Metadata** (read), **Webhooks** (read and write).
2. **In Easypanel:** **Settings** → **Github** → incolla il token (es. `ghp_xxxx...`) → salva.

### Opzione B – Git SSH (per repo privata senza token)

1. In Easypanel apri l’**App** (o il **Compose**) che userà questa repo.
2. Nel pannello **Source** → tab **Git** → copia la **SSH key** mostrata.
3. Su **GitHub:** repo → **Settings** → **Deploy keys** → **Add deploy key** → incolla la chiave, titolo es. `Easypanel`.
4. Torna in Easypanel e nella **Source** inserisci:
   - **Repository URL:** `git@github.com:TUO-USERNAME/TUO-REPO.git`
   - **Branch:** `main` (o il branch che usi)
5. Salva.

---

## 2. Come usare la repo (Compose vs App)

- **Se usi il Compose Service:** nella configurazione del Compose indica come sorgente questa repo (URL Git + branch). Easypanel clonerà la repo e userà il `docker-compose.yml` che troverà nella root.
- **Se usi servizi singoli:** crea un servizio **Postgres** (o immagine PostGIS se supportata) e un servizio **App** con sorgente GitHub che punta a questa repo; per l’App potresti usare un Dockerfile che estende `directus/directus` e copia `extensions/` (vedi sotto).

---

## 3. File che devono esserci nella repo perché tutto funzioni online

| File / cartella | Obbligatorio | Note |
|-----------------|--------------|------|
| `docker-compose.yml` | ✅ | Definisce database + Directus, volumi, porte. |
| `init-db/` | ✅ | Script SQL eseguiti al primo avvio del DB (es. `backup.sql` o altri `.sql`). |
| `extensions/` | ✅ | Estensioni Directus (moduli, panel, ecc.). Devono essere nella repo per essere deployate. |
| `.env.example` | Consigliato | Template variabili; **non** contiene segreti. |
| `README.md` | Opzionale | Documentazione progetto. |
| `.gitignore` | Consigliato | Esclude `.env`, `node_modules`, ecc. |

**Non devono essere in repo (e non ci devono essere):**

| Elemento | Motivo |
|----------|--------|
| `.env` | Contiene segreti; va configurato solo su Easypanel / server. |
| `node_modules/` | Dipendenze; si installano in build o non servono per le immagini Docker qui. |
| `uploads/` | File caricati dagli utenti; vanno su volume persistente sul server, non in Git. |

**Sul server (Easypanel):**

- **Variabili d’ambiente:** tutto ciò che è nel tuo `.env` locale va impostato nell’**Environment** del servizio (o del Compose) in Easypanel. Usa `.env.example` come riferimento.
- **Uploads:** se usi il Compose così com’è, il volume `./uploads` sarà creato sul server; non serve mettere `uploads/` in Git.

---

## 4. Variabili da configurare in Easypanel (Environment)

Copia i nomi (e i valori che scegli) da `.env.example`. Per il deploy servono almeno:

**Database (compose / container DB):**

- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE`

**Directus (container Directus):**

- `DB_CLIENT=pg`
- `DB_HOST=database` (nome del servizio DB nel compose; se usi servizi separati, usa l’host interno Easypanel)
- `DB_PORT=5432`
- `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` (stessi del DB)
- `KEY` – stringa casuale lunga (es. 32+ caratteri)
- `SECRET` – altra stringa casuale lunga
- `ADMIN_EMAIL` – email primo admin
- `ADMIN_PASSWORD` – password primo admin
- `PUBLIC_URL` – URL pubblico dell’istanza (es. `https://directus.tuodominio.com`)

Genera `KEY` e `SECRET` con uno strumento a caso (es. `openssl rand -hex 32`).

---

## 5. Checklist veloce

- [ ] Repo su GitHub con almeno: `docker-compose.yml`, `init-db/`, `extensions/`, `.env.example`, `.gitignore`.
- [ ] Nessun `.env` o `node_modules/` in repo; `uploads/` non versionato (opzionale escluderlo anche in `.gitignore`).
- [ ] In Easypanel: GitHub collegato (token in Settings **oppure** Deploy key + URL repo nella Source).
- [ ] Sorgente dell’app/compose impostata su questa repo e branch corretto (es. `main`).
- [ ] Environment in Easypanel compilato con tutte le variabili elencate sopra (usando `.env.example` come guida).
- [ ] Deploy eseguito; dominio e porta (8055) configurati se serve.

Dopo il primo deploy, gli script in `init-db/` vengono eseguiti solo alla prima creazione del volume del DB; le estensioni in `extensions/` vengono usate dal container Directus tramite il volume definito nel `docker-compose.yml`.

---

## 6. Troubleshooting: "Distribuisci" che carica all'infinito

Se clicchi **Distribuisci** e la pagina resta in caricamento:

1. **Controlla i log di build**  
   In Easypanel apri l’app → **Deploy** (o **Build**) e cerca **Log** / **Build logs**. Verifica se:
   - la clone della repo va a buon fine;
   - la build Docker parte e dove si ferma (errore di rete, memoria, Dockerfile non trovato, ecc.).

2. **La prima build può durare diversi minuti**  
   Scaricare l’immagine base `directus/directus` e copiare la cartella `extensions/` richiede tempo. Attendi almeno 5–10 minuti prima di considerarla bloccata.

3. **Ridurre il contesto di build**  
   Nella repo è presente un file **`.dockerignore`** che esclude `.git`, `node_modules`, documentazione, ecc. Fai push di `.dockerignore` e riesegui il deploy: la build sarà più veloce e meno soggetta a timeout.

4. **Prova senza build (solo immagine)**  
   Per verificare che il problema sia la build e non la rete/permessi: in **Sorgente** passa temporaneamente a **Immagine Docker** con `directus/directus:latest`. Se il deploy va a buon fine, il blocco è sulla build da GitHub (clone lento, build timeout, risorse server). Torna poi a **Github** + **Dockerfile** quando hai controllato i log.

5. **Risorse server (Hostinger)**  
   Su piani condivisi la build può andare in timeout o out-of-memory. In Easypanel controlla se ci sono limiti di tempo o memoria per la build; in caso aumenta temporaneamente le risorse o esegui la build in orari di minor carico.
