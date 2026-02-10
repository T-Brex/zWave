/**
 * Costanti condivise per l'estensione Chiamate Outbound.
 */

export const LEADS_COLLECTION = 'leads';
export const CLIENTI_COLLECTION = 'clienti';
export const CHIAMATE_OUTBOUND_COLLECTION = 'chiamate_outbound';

export const WEBHOOK_IMPORT_LEADS =
  'https://n8n.srv1075424.hstgr.cloud/webhook/0167c3ea-e2b7-448f-9c4e-8ee8a5634ce8';
export const WEBHOOK_CHIAMA =
  'https://n8n.srv1075424.hstgr.cloud/webhook/43f8ed20-b759-4003-a00b-0452519a481b';
export const WEBHOOK_NUMERO =
  'https://n8n.srv1075424.hstgr.cloud/webhook/ad97ad9e-b5ba-405e-82e8-a509625dad15';

/** Timeout (ms) dopo cui rimuovere numeri non verificati da numeri_associati */
export const NUMERI_ASSOCIATI_CLEANUP_MS = 5 * 60 * 1000;

/** Opzioni giorni settimana per richiamate (1 = Lun, 7 = Dom) */
export const GIORNI_OPTIONS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' },
];
