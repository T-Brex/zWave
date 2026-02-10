# n8n: invio riassunto WhatsApp da Directus (array telefono)

Il modulo **Impostazioni → WhatsApp** in Directus salva i numeri di telefono nella collection **clienti**, nel campo **telefono**, come **array JSON** (es. `["393333544435", "393361112233"]`).  
In n8n puoi leggere questi dati da Directus e inviare un messaggio WhatsApp a **ogni numero** dell’array con un loop.

---

## Come mandare i dati del campo "telefono" da Directus a n8n

I dati non vengono “inviati” da Directus a n8n in automatico: **è n8n che li va a prendere** chiamando l’API di Directus quando il workflow parte (trigger).

### 1. n8n legge da Directus (consigliato)

1. **Apri il workflow** in n8n e aggiungi un **Trigger** (Schedule, Webhook, Manuale, ecc.) che avvia il flusso quando serve.
2. Aggiungi un nodo per leggere Directus. Hai due possibilità:

   **Opzione A – Nodo “Directus”** (se presente nel tuo n8n):
   - Inserisci il nodo **Directus**.
   - Configura **credenziali** (URL Directus + token, es. token statico).
   - **Operation:** “Get” (o “Get Many” se vuoi più record).
   - **Collection:** `clienti`.
   - **Filter:** se vuoi un solo cliente per azienda, filtra per `azienda` (es. `nome_azienda`) o per `id`.
   - Nei campi da restituire includi almeno: `id`, `azienda`, `telefono`.

   **Opzione B – Nodo “HTTP Request”**:
   - **Method:** GET.
   - **URL:**  
     `https://TUO-DIRECTUS/items/clienti?filter[azienda][_eq]=NOME_AZIENDA&fields=id,azienda,telefono`  
     (sostituisci `TUO-DIRECTUS` e `NOME_AZIENDA`; per più record togli il filtro o usa `filter[id][_eq]=...` per un singolo `id`).
   - **Authentication:** Header, es.  
     `Authorization: Bearer IL_TUO_TOKEN_DIRECTUS`.

3. L’output del nodo conterrà gli item della collection `clienti`. Ogni item avrà il campo **`telefono`**: in Directus è una **stringa** che contiene un array in JSON (es. `["393333544435","393361112233"]`).

4. Subito dopo, aggiungi un nodo **Code** per usare quel campo in n8n:
   - Leggi l’item in ingresso (es. `$input.first().json`).
   - Estrai `telefono` e convertilo in array:
     - Se è già un array, usalo così.
     - Se è una stringa, fai `JSON.parse(telefono || '[]')`.
   - Da qui in poi nel workflow userai questo array (es. per creare un item per ogni numero e inviare WhatsApp).

In sintesi: **il campo "telefono" arriva a n8n perché n8n fa una GET all’API Directus sulla collection `clienti`**; il valore di `telefono` lo trovi nell’output della richiesta e lo usi nel nodo Code (e nel loop) come descritto sopra.

### 2. (Avanzato) Directus chiama n8n con un webhook

Se vuoi che sia **Directus** a notificare n8n quando i dati cambiano (invece di far partire n8n a orari fissi), devi configurare in Directus un **Flow** o **Hook** che, alla modifica di un record in `clienti`, chiama un **Webhook** di n8n (URL del tipo `https://tua-n8n/webhook/...`) con in body i dati che ti servono (es. `id`, `azienda`, `telefono`). In quel caso i dati “arrivano” a n8n nel body della richiesta POST del webhook. Per il caso “invio riassunto WhatsApp” di solito basta che n8n legga da Directus come al punto 1.

---

## Requisiti Directus

- Collection **clienti** con almeno:
  - **azienda** (string)
  - **telefono** (tipo **stringa**): contiene un array in formato JSON, es. `["393333544435", "393361112233"]`
- Un “cliente primario” per azienda (il primo per `id`) contiene il campo `telefono` per quell’azienda.

## Selezionare l’item giusto con (per ogni azienda: agent_id + id_voce_agente)

Hai un **nodo precedente** che passa **`id_agent`** e il nodo **Directus** che restituisce **tutta** la collection `clienti`. Devi prendere dall’uscita Directus **solo l’item** il cui `id_voce_agente` corrisponde a `agent_id`. Due modi:

### Metodo 1 – Nodo Merge (consigliato)

1. Collega **entrambi** gli output al nodo **Merge**:
   - Input 1: il nodo che fornisce `agent_id` (un solo item).
   - Input 2: il nodo **Directus** “Get many items” (N item).

2. Configura il Merge (importante: **non** usare "Append"):
   - **Mode:** **Combine** (non Append)
   - **Combine by:** **Merge by Key**
   - **Key 1** (Input 1 – nodo con agent_id, es. Edit Fields): `agent_id`
   - **Key 2** (Input 2 – Directus Get many items): `id_voce_agente`

   Con "Append" ottieni solo una concatenazione di item; con "Combine" + "Merge by Key" ottieni un solo item per ogni corrispondenza tra le due chiavi.

3. In uscita avrai **un solo item**: il cliente della collection `clienti` per cui `id_voce_agente === agent_id`. Se non c’è corrispondenza, non esce nessun item.

4. Collega l’uscita del Merge a un nodo **Code** che legge l’item (ha `id_user`, `azienda`, `telefono`) e crea **un item per ogni numero**:

   ```js
   const item = $input.first().json;
   const telefono = item.telefono;
   const arr = typeof telefono === 'string' ? JSON.parse(telefono || '[]') : (Array.isArray(telefono) ? telefono : []);
   const numeri = arr.map(n => String(n).trim()).filter(Boolean);
   return numeri.map(num => ({ json: { telefono: num, azienda: item.azienda } }));
   ```

5. Collega l’uscita del Code al nodo **WhatsApp** e usa `{{ $json.telefono }}` come destinatario.

### Metodo 2 – Solo nodo Code

Un solo nodo **Code** dopo Directus, che riceve l’output del nodo con `agent_id` e quello Directus (entrambi collegati al Code). Nel Code referenzia i nodi per nome (sostituisci con i nomi reali):

- **Nome del nodo che passa agent_id:** es. `Trigger` o `Webhook`
- **Nome del nodo Directus:** es. `Get many items`

```js
const agentId = $('NOME_NODO_AGENT').first().json.agent_id;   // es. $('Webhook').first().json.agent_id
const clientiItems = $('Get many items').all().map(i => i.json);

const cliente = clientiItems.find(c => c.id_voce_agente != null && String(c.id_voce_agente) === String(agentId));

if (!cliente) return [];

const telefono = cliente.telefono;
const arr = typeof telefono === 'string' ? JSON.parse(telefono || '[]') : (Array.isArray(telefono) ? telefono : []);
const numeri = arr.map(n => String(n).trim()).filter(Boolean);

return numeri.map(num => ({ json: { telefono: num, azienda: cliente.azienda } }));
```

- Se `id_agent` è l’**id del record** in Directus, (rimosso: ora il match è su id_voce_agente = agent_id).
- Se `id_agent` è l’**id utente** del cliente, (rimosso).

In uscita avrai **un item per ogni numero di telefono** di quel cliente; poi collega al nodo WhatsApp e usa `{{ $json.telefono }}` come destinatario.

---

## Flusso n8n (schema)

1. **Trigger** (Schedule, Webhook, ecc.) che decide per quale azienda/cliente inviare il riassunto.
2. **Directus – Get item(s)** (o **HTTP Request** all’API Directus): leggi il record della collection `clienti` (es. filtrando per `azienda` o per `id`).  
   - Campi da richiedere: `id`, `azienda`, `telefono`.
3. **Code**: il campo `telefono` in Directus è una **stringa** (JSON). Convertilo in array:  
   - `const arr = typeof telefono === 'string' ? JSON.parse(telefono || '[]') : (Array.isArray(telefono) ? telefono : []);`  
   - Se è `null`/undefined, usa `[]`.
4. **Split Out** (o **Loop Over Items**): da un singolo item con `telefono = ["39...", "39..."]` produci **N item**, uno per numero.  
   - In n8n puoi usare un nodo **Code** che restituisce un item per ogni elemento dell’array, es.:
   ```js
   const telefono = $input.first().json.telefono;
   const arr = Array.isArray(telefono) ? telefono : (typeof telefono === 'string' ? JSON.parse(telefono || '[]') : []);
   return arr.map(num => ({ json: { telefono: String(num).trim() } }));
   ```
5. **WhatsApp** (o il nodo che usi per l’invio): per ogni item ricevi un `telefono`; invia il messaggio di riassunto a quel numero.

## Esempio struttura workflow (per ogni azienda)

```
[Nodo con agent_id] ──┐
                      ├──→ [Merge: agent_id = id_voce_agente] → [Code: telefono → N item] → [WhatsApp: {{ $json.telefono }}]
[Directus: Get many items clienti] ──┘
```

## Formato campo telefono in Directus

- **Tipo campo:** stringa  
- **Valore:** stringa JSON che rappresenta un array di numeri, es.:
  ```json
  "[\"393333544435\", \"393361112233\", \"39021234567\"]"
  ```
- In n8n, dopo **Get item**, `$json.telefono` sarà una **stringa**; usa `JSON.parse($json.telefono)` per ottenere l’array.  
- Il **loop** crea un item per ogni elemento; il nodo WhatsApp userà quel numero per l’invio.

## Vantaggi rispetto a Google Sheet / Filtro Clienti

- Nessuna dipendenza da Google Sheet né dalla Data table «Filtro Clienti» in n8n.
- I numeri sono gestiti solo in Directus (Impostazioni → WhatsApp) e salvati in `clienti.telefono`.
- Aggiunta/rimozione/modifica numeri dalla UI Directus; n8n legge sempre l’array aggiornato da Directus.
