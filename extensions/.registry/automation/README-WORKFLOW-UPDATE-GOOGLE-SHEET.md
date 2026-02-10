# Workflow n8n: aggiornare il numero WhatsApp sul Google Sheet «Credenziali immobiliari»

Questa guida spiega come creare in n8n un workflow che riceve il nuovo numero di telefono dall’estensione **Impostazioni → WhatsApp** di Directus e aggiorna il foglio **Credenziali immobiliari** (colonna **Numero Cliente (invio messaggio)**).

---

## Foglio Google da aggiornare

- **Nome foglio:** Credenziali immobiliari  
- **Tab:** `CREDENZIALI`  
- **Colonna A:** `Nome agenzia` → usata per trovare la riga da aggiornare  
- **Colonna J:** `Numero Cliente (invio messaggio)` → dove scrivere il nuovo numero  

L’estensione Directus invia al webhook:

- `nome_agenzia` – nome dell’agenzia (deve corrispondere a una cella in colonna A)
- `telefono` – nuovo numero da salvare in colonna J
- `google_sheet_id` – ID del documento (opzionale, se vuoi usarlo nel workflow)

---

## Prerequisiti

1. **n8n** installato e raggiungibile (es. `https://n8n.srv1075424.hstgr.cloud`).
2. **Google Sheets** configurato in n8n (credenziali OAuth2 o Service Account con accesso al foglio).
3. **ID del foglio:** nell’URL del foglio  
   `https://docs.google.com/spreadsheets/d/1n6sgk6Ht8QCiULsYtPay0Eq2Nm751twdQoALg2hb1iI/edit`  
   l’ID è: `1n6sgk6Ht8QCiULsYtPay0Eq2Nm751twdQoALg2hb1iI`.

---

## Passo 1: nuovo workflow e Webhook

1. In n8n crea un **nuovo workflow**.
2. Aggiungi il trigger **Webhook**.
3. Configura il Webhook:
   - **HTTP Method:** `POST`
   - **Path:** lascia quello generato (es. un UUID) oppure imposta un path fisso.
   - **Respond:** scegli **Using ‘Respond to Webhook’ Node** (obbligatorio: altrimenti n8n segnala “Unused Respond to Webhook”).
4. Salva e **attiva** il workflow (solo così l’URL è valido).
5. Copia l’**URL del webhook** (es. `https://n8n.srv1075424.hstgr.cloud/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).  
   Lo userai in Directus in `WEBHOOK_WHATSAPP_UPDATE`.

Il body che arriva dal modulo Impostazioni è ad esempio:

```json
{
  "telefono": "393333544435",
  "google_sheet_id": "1n6sgk6Ht8QCiULsYtPay0Eq2Nm751twdQoALg2hb1iI",
  "nome_agenzia": "Z Wave Immobiliare"
}
```

---

## Passo 2: leggere il foglio per trovare la riga

Per aggiornare la colonna J della riga giusta devi prima sapere **in quale riga** si trova `nome_agenzia` nella colonna A.

1. Aggiungi un nodo **Google Sheets**.
2. Configura:
   - **Operation:** *Read* (o *Get Many* / *Leggi*).
   - **Document:** seleziona il foglio «Credenziali immobiliari» (o inserisci l’ID: `1n6sgk6Ht8QCiULsYtPay0Eq2Nm751twdQoALg2hb1iI`).
   - **Sheet:** tab `CREDENZIALI`.
   - **Range:** ad esempio `A2:J` (dalla riga 2, per saltare l’intestazione). In questo modo ottieni tutte le righe con colonne da A a J.

Collega l’ingresso di questo nodo all’**uscita del Webhook** (così hai accesso a `$json.body.nome_agenzia` e `$json.body.telefono`).

---

## Passo 3: trovare l’indice della riga dove A = nome_agenzia

Devi individuare la riga in cui la colonna A è uguale a `nome_agenzia` inviato dal webhook.

**Opzione A – Nodo Code (consigliata)**

1. Aggiungi un nodo **Code**.
2. In ingresso arriva l’output del Webhook (con `body.nome_agenzia`, `body.telefono`) e l’output di Google Sheets (array di righe).
   - In n8n puoi usare **Merge** per unire Webhook + Google Sheets, oppure passare i dati del Webhook con **Set** e poi far entrare nel Code sia l’item del Webhook sia l’output delle righe del foglio.

Struttura semplice: un **Merge** (mode “Combine”, “Merge By Index” con 1 item dal Webhook e N items da Google Sheets) non è ideale. Meglio:

- **Nodo 1:** Webhook (esce 1 item con `body`).
- **Nodo 2:** Google Sheets Read (esce N items, uno per riga).
- **Nodo 3:** Code che riceve **tutti** gli items (Items da Google Sheets) e accede ai dati del Webhook dal primo item del nodo Webhook. In n8n puoi usare `$('Webhook').first().json.body` per avere `nome_agenzia` e `telefono`.

Esempio in un nodo **Code** (JavaScript) che riceve le righe dal nodo Google Sheets e legge il body dal Webhook:

```javascript
const body = $('Webhook').first().json.body;
const nomeAgenzia = body.nome_agenzia || '';
const telefono = body.telefono || '';

const items = $input.all();
let rowIndex = -1;  // riga nel foglio (1-based, con header = 1)

for (let i = 0; i < items.length; i++) {
  const row = items[i].json;
  const colA = (row.A ?? row['Nome agenzia'] ?? '').toString().trim();
  if (colA === nomeAgenzia) {
    rowIndex = i + 2;  // +2 perché la riga 1 è l’header
    break;
  }
}

if (rowIndex === -1) {
  return [{ json: { success: false, error: 'Agenzia non trovata: ' + nomeAgenzia } }];
}

return [{ json: { success: true, rowIndex, telefono } }];
```

- Collega l’ingresso del Code all’uscita del nodo **Google Sheets** (Read).
- Assicurati che il nodo Webhook si chiami proprio `Webhook` (o adatta `$('Webhook')` al nome del nodo).

**Opzione B – Filtro (Filter)**

- Aggiungi un nodo **Filter** dopo Google Sheets: condizione tipo “Column A equals `{{ $json.body.nome_agenzia }}`”.
- Il problema è che il body è nel nodo Webhook, non in ogni riga del foglio. Quindi devi prima unire (es. con **Set**) il `nome_agenzia` a ogni item. In pratica è più semplice usare il nodo Code sopra.

---

## Passo 4: aggiornare la cella in colonna J

1. Aggiungi un altro nodo **Google Sheets**.
2. Configura:
   - **Operation:** *Update* (o *Aggiorna cella*).
   - **Document:** stesso foglio (Credenziali immobiliari).
   - **Sheet:** `CREDENZIALI`.
   - **Range:** la notazione A1 è tipo `J2`, `J3`, … quindi usa il valore calcolato prima, ad es.  
     `J{{ $json.rowIndex }}`  
     (dove `rowIndex` è quello uscito dal nodo Code).
   - **Value / Valore:** `{{ $json.telefono }}`.

Collega l’ingresso a uscita del nodo **Code** (solo quando `success: true`).

---

## Passo 5: rispondere al webhook (Respond to Webhook)

1. Aggiungi il nodo **Respond to Webhook**.
2. Collega:
   - l’**ingresso** all’uscita del nodo che aggiorna il foglio (secondo Google Sheets), e
   - opzionalmente un ramo “errore” (uscita del Code quando `success: false`) per rispondere con status 400 e un messaggio.

Configurazione tipica del **Respond to Webhook**:

- **Respond With:** JSON  
- **Response Body:** ad es.  
  `{ "ok": true, "message": "Numero aggiornato" }`  
  per il caso di successo, e per l’errore (se gestito) qualcosa tipo  
  `{ "ok": false, "error": "{{ $json.error }}" }`.

Così Directus riceve una risposta chiara e può mostrare messaggio di successo o errore.

---

## Schema del flusso

```
[Webhook POST] → [Google Sheets: Read A2:J] → [Code: trova rowIndex da nome_agenzia]
                                                      ↓
                                            [Google Sheets: Update J{rowIndex} = telefono]
                                                      ↓
                                            [Respond to Webhook]
```

Se l’agenzia non viene trovata, dal Code esce `success: false`; puoi collegare questa uscita a un altro **Respond to Webhook** con status code 400 e body `{ "ok": false, "error": "..." }`.

---

## Collegare Directus al workflow

1. Nel file `extensions/.registry/settings/src/module.vue` cerca la costante:
   ```js
   const WEBHOOK_WHATSAPP_UPDATE = 'https://n8n.../webhook-test/...';
   ```
2. Sostituisci l’URL con l’**URL production** del webhook creato in n8n (senza `-test`), ad es.:
   ```js
   const WEBHOOK_WHATSAPP_UPDATE = 'https://n8n.srv1075424.hstgr.cloud/webhook/IL_TUO_ID_WEBHOOK';
   ```
3. Ricompila l’estensione:
   ```bash
   cd extensions/.registry/settings
   npm run build
   ```
4. Ricarica Directus e prova da **Impostazioni → WhatsApp**: seleziona un’azienda, modifica il numero e clicca **Salva su Google Sheet**. Il foglio «Credenziali immobiliari», tab CREDENZIALI, colonna J, dovrebbe aggiornarsi per la riga con quel «Nome agenzia».

---

## Riepilogo colonne e dati

| Dove              | Contenuto                         | Uso nel workflow              |
|-------------------|-----------------------------------|-------------------------------|
| Colonna A         | Nome agenzia                      | Cercare la riga da aggiornare |
| Colonna J         | Numero Cliente (invio messaggio)  | Cella da aggiornare con `telefono` |
| Body webhook      | `nome_agenzia`, `telefono`, `google_sheet_id` | Lettura e passaggio al Code / Update |

Se un’agenzia in Directus non compare nella colonna A del foglio, il workflow può rispondere con errore “Agenzia non trovata” e non modificare il foglio.
