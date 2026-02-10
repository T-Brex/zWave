# Estensione Directus - Nascondi UI per Non Admin

Questa estensione nasconde graficamente diverse sezioni dell'interfaccia Directus per gli utenti non admin.

## Funzionalità

L'estensione nasconde per i non admin:
- ✅ Sezione **Collections** (Content)
- ✅ Sezione **Elenco Utenti** (Users)
- ✅ Sezione **Documentazione** (Docs/Help)
- ✅ Sezione **Libreria File** (Files)
- ⚠️ **Sidebar destra** (richiede estensione module separata)

## Installazione

1. **Compila l'estensione:**
   ```bash
   npm run build
   ```

2. **Installa l'estensione:**
   - Copia la cartella `dist` nella cartella `extensions` di Directus
   - Oppure usa `npm run link` se hai configurato il link

3. **Riavvia Directus** per caricare l'hook

## Note sulla Sidebar Destra

Per nascondere completamente la sidebar destra, è necessario creare anche un'estensione module separata. I file `app.js` e `app.vue` sono già presenti nel progetto ma non vengono compilati con l'estensione hook attuale.

Per abilitare la funzionalità di nascondere la sidebar destra:
1. Crea un'estensione module separata usando i file `app.js` e `app.vue`
2. Abilita il modulo nelle impostazioni di Directus

## Sviluppo

```bash
# Sviluppo con watch
npm run dev

# Build per produzione
npm run build

# Validazione
npm run validate
```

## Limitazioni

⚠️ **Importante:** Questa estensione nasconde solo graficamente gli elementi. Per sicurezza completa, configura anche i permessi delle collections tramite **Access Control** in Directus.
