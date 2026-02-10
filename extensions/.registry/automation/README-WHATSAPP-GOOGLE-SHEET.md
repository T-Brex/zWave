# WhatsApp – Numeri in Directus (clienti.telefono)

**Nota:** Il modulo **Impostazioni → WhatsApp** **non** usa più il webhook n8n «Filtro Clienti» né il Google Sheet.

## Comportamento attuale

- Le aziende sono lette dalla collection Directus **clienti** (campo **azienda**).
- Per ogni azienda viene usato un record “primario” (il primo per `id`); il campo **telefono** di quel record è una **stringa** che contiene un array in formato JSON (es. `["393333544435", "393361112233"]`).
- L’utente può aggiungere, modificare e rimuovere numeri dalla UI; i dati vengono salvati in Directus con `PATCH /items/clienti/:id` (campo `telefono`).

## n8n: invio riassunto a ogni numero

Per inviare un messaggio WhatsApp a ogni numero dell’array:

1. Leggi da Directus il record `clienti` (con `azienda` e `telefono`).
2. In n8n crea un **loop** sull’array `telefono` (un item per numero).
3. Usa il nodo WhatsApp esistente per inviare il messaggio a `{{ $json.telefono }}` per ogni item.

Vedi **README-N8N-RIASSUNTO-WHATSAPP.md** per lo schema del workflow e gli esempi di nodi (Directus, Code, Split, WhatsApp).
