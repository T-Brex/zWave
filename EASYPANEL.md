# Deploy su Easypanel (source GitHub)

Guida per usare **extensions** e **uploads** quando il progetto è deployato su Easypanel con GitHub come source.

---

## 1. Extensions

### Come funziona

- Il **Dockerfile** della repo costruisce le estensioni da `extensions/` e le copia nell’immagine in `/directus/extensions`.
- Easypanel, facendo build da GitHub, userà quel Dockerfile: le estensioni **presenti in Git** saranno già dentro il container.

### Cosa fare

1. **Assicurati che tutte le estensioni che vuoi usare siano su GitHub**  
   In locale hai file non tracciati (es. `extensions/.registry/common/`, `TrasferimentoChiamateView.vue`, ecc.). Per averle su Easypanel:
   - Aggiungile e committale:  
     `git add extensions/`  
     `git commit -m "Add extensions"`  
     `git push`
   - Poi su Easypanel fai **Redeploy** (rebuild) dell’app.

2. **Non montare un volume su `/directus/extensions`**  
   Se monti un volume su `/directus/extensions` sovrascrivi le estensioni incluse nell’immagine. Lascia che siano quelle “baked in” dal Dockerfile.

---

## 2. Uploads

### Come funziona

- La cartella `uploads/` è in **.gitignore**: non va su GitHub e non è nel container dopo il build.
- I file caricati dagli utenti devono vivere in un **volume persistente** sul server.

### Cosa fare su Easypanel

1. Apri il tuo **App** (servizio Directus) su Easypanel.
2. Vai in **Mounts** (o **Storage** / **Volumes**, a seconda dell’interfaccia).
3. Aggiungi un **Volume**:
   - **Mount path (nel container):**  
     ` /directus/uploads `
   - **Nome volume:** es. `directus-uploads`
4. Salva e riavvia il servizio.

Da quel momento Directus userà quel volume per tutti gli upload; i file restano anche dopo redeploy/restart.

### Usare gli upload che hai in locale sul server

Se vuoi “portare” la cartella `uploads` che hai in locale sul server Easypanel:

**Opzione A – Copia via SSH sul server**

- Sul server Easypanel i volumi sono in percorsi tipo:  
  `/etc/easypanel/projects/[project]/[service]/volumes/[nome-volume]`
- Con SSH sul server:
  1. Individua il volume `directus-uploads` (o il nome che hai dato) per il servizio Directus.
  2. Copia il contenuto della tua cartella locale `uploads/` dentro quella directory (es. con `rsync` o `scp` da un altro PC).

**Opzione B – Da un altro ambiente Directus**

- Se gli upload sono già in un’altra istanza Directus, usa backup/restore o export dei file e poi carica/ripristina sul Directus su Easypanel.

---

## Riepilogo

| Cosa        | Dove / come |
|------------|-------------|
| **Extensions** | Incluse nell’immagine dal Dockerfile. Metti tutto in Git, push, poi redeploy. Non montare un volume su `/directus/extensions`. |
| **Uploads**    | Non sono in Git. Aggiungi un volume Easypanel con mount path `/directus/uploads`. Per “usare” gli upload locali, copiali nel volume sul server (SSH + rsync/scp) o tramite backup/restore Directus. |
