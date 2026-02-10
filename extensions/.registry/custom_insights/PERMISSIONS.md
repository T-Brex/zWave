# Permessi Directus per il modulo Approfondimenti (Custom Insights)

Se un utente con ruolo non-admin (es. "Cliente") vede l'errore  
**"You don't have permission to access field ... in collection ..."**,  
va configurato l’**Access Control** in Directus per quel ruolo.

## Cosa fa il modulo

- Legge dalla collection **clienti**: `id`, `azienda`, `minuti_totali`, `minuti_rimanenti`, `minuti_usati`.
- Legge dalla collection **Chiamate**: `date_created`, `durata_minuti`, `prenotazione_effettuata`, `azienda`.

L’API usa sempre il token dell’utente loggato, quindi il ruolo "Cliente" deve avere **almeno lettura** su queste collection e campi.

## Passi in Directus (come Admin)

1. Vai in **Settings** (ingranaggio) → **Access Control** (o **Utenti e permessi** / **Roles**).
2. Seleziona il **ruolo** usato dai clienti (es. "Cliente", "User").
3. **Collection `clienti`**:
   - Abilita **Read** (lettura).
   - In **Field Permissions** (permessi per campo) assicurati che siano consentiti in lettura:
     - `id`
     - `azienda`
     - `minuti_totali`
     - `minuti_rimanenti`
     - `minuti_usati`
   - In **Item Permissions** (regola “chi vede cosa”): imposta una regola così che l’utente veda **solo il proprio** record, ad esempio:
     - Se nella tabella **users** hai un campo che lega l’utente al cliente (es. `cliente_id`):  
       **Rule**: `id` = `$CURRENT_USER.cliente_id`
     - Oppure, se il cliente è identificato per azienda:  
       **Rule**: `azienda` = `$CURRENT_USER.azienda`  
       (solo se nel profilo utente hai un campo `azienda`).
4. **Collection `Chiamate`**:
   - Abilita **Read**.
   - In **Field Permissions** abilita in lettura:
     - `date_created`
     - `durata_minuti`
     - `prenotazione_effettuata`
     - `azienda`
   - In **Item Permissions**: limita alle sole chiamate del cliente, ad esempio:
     - **Rule**: `azienda` = `$CURRENT_USER.azienda`  
       (o il campo che nel tuo schema lega la chiamata all’utente/cliente).

## Riepilogo campi da consentire in lettura

| Collection  | Campi da abilitare (Read) |
|------------|----------------------------|
| **clienti** | id, azienda, minuti_totali, minuti_rimanenti, minuti_usati |
| **Chiamate**| date_created, durata_minuti, prenotazione_effettuata, azienda |

Le **Item Permissions** dipendono da come hai collegato utenti e clienti (campo su `directus_users` o relazione clienti ↔ utenti). Configurale in base allo schema del tuo progetto.

Dopo aver salvato i permessi, l’utente cliente dovrebbe poter aprire il modulo Approfondimenti senza l’errore di permesso.
