# Deploy su Easypanel con sorgente GitHub

Guida per collegare questa repo a Easypanel e avere tutto funzionante online.

---
## Immagine Docker
   directus/directus:11.14.1
## 0. Già online? Aggiungere la repo GitHub senza rompere nulla

Se hai **già** un deploy Easypanel funzionante (Directus + DB su Hostinger o altro) e vuoi solo **aggiungere questa repo GitHub come sorgente** (per auto-deploy o per usare il `docker-compose.yml` da Git):

1. **Backup preventivo (consigliato)**  
   - In Easypanel: esporta le variabili d’ambiente del progetto (copia-incolla in un file locale).  


KEY=20f92c4c08d9893aa2dbc280ab0732e1d2c265ceadfcdc8d
SECRET=fcacbf50f652a6974663608da2c5dc4a48d9745fcff63546
DB_CLIENT=postgres
DB_HOST=$(PROJECT_NAME)_directus-db
DB_PORT=5432
DB_DATABASE=$(PROJECT_NAME)
DB_USER=postgres
DB_PASSWORD=1d2682bf0ed2d39e2ef6
CACHE_ENABLED=false
CACHE_STORE=redis
REDIS=redis://default:2e73fab0a572332d0204@$(PROJECT_NAME)_directus-redis:6379
ADMIN_EMAIL=pin.dav@libero.it
ADMIN_PASSWORD=Test123!



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
