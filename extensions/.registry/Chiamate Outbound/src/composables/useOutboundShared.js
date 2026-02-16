/**
 * Stato e azioni condivisi tra Elenco lead e Impostazioni Outbound.
 * Utilizzato dal modulo principale e fornito ai componenti figli.
 */
import { ref, computed } from 'vue';
import {
  LEADS_COLLECTION,
  CLIENTI_COLLECTION,
  CHIAMATE_OUTBOUND_COLLECTION,
} from '../constants.js';

export function useOutboundShared(api) {
  const aziende = ref([]);
  const aziendeLoading = ref(false);
  const aziendeError = ref(null);
  const selectedAzienda = ref(null);
  const drawerOpen = ref(false);
  const selectedGoogleFoglioUrl = ref(null);
  const selectedClienteId = ref(null);
  const selectedClienteIdUser = ref(null);
  const selectedChiamateOutboundId = ref(null); // id del record chiamate_outbound (per toggle chiamate_automatiche)
  const chiamateAutomatiche = ref(false);
  const chiamateAutomaticheLoading = ref(false);
  const chiamateAutomaticheError = ref(null);

  const drawerTitle = computed(() => {
    if (aziendeLoading.value) return 'Caricamento...';
    if (aziendeError.value) return 'Errore';
    return `Aziende (${aziende.value.length})`;
  });

  async function loadAziende() {
    aziendeLoading.value = true;
    aziendeError.value = null;
    try {
      const response = await api.get(`/items/${CLIENTI_COLLECTION}`, {
        params: { fields: ['azienda'], limit: -1 },
      });
      const items = response?.data?.data || [];
      const aziendeSet = new Set();
      items.forEach((item) => {
        const v = item?.azienda;
        if (v && typeof v === 'string' && v.trim()) aziendeSet.add(v.trim());
      });
      aziende.value = Array.from(aziendeSet).sort();
      if (aziende.value.length > 0 && !selectedAzienda.value) {
        const saved = localStorage.getItem('outbound_selected_azienda');
        if (saved && aziende.value.includes(saved)) selectedAzienda.value = saved;
        else selectedAzienda.value = aziende.value[0];
      }
    } catch (err) {
      console.error('Error loading aziende:', err);
      const status = err?.response?.status;
      const message = err?.response?.data?.errors?.[0]?.message || err?.message || 'Errore sconosciuto';
      if (status === 403) aziendeError.value = { title: 'Accesso negato', message: `Non hai i permessi per accedere alla collection "${CLIENTI_COLLECTION}".` };
      else if (status === 404) aziendeError.value = { title: 'Collection non trovata', message: `La collection "${CLIENTI_COLLECTION}" non esiste.` };
      else aziendeError.value = { title: 'Errore di caricamento', message: `Impossibile caricare le aziende: ${message}.` };
      aziende.value = [];
    } finally {
      aziendeLoading.value = false;
    }
  }

  function selectAzienda(aziendaName) {
    if (!aziendaName || typeof aziendaName !== 'string') return;
    selectedAzienda.value = aziendaName;
    localStorage.setItem('outbound_selected_azienda', aziendaName);
  }

  async function loadGoogleFoglioUrl() {
    selectedGoogleFoglioUrl.value = null;
    selectedClienteId.value = null;
    selectedClienteIdUser.value = null;
    selectedChiamateOutboundId.value = null;
    chiamateAutomatiche.value = false;
    if (!selectedAzienda.value) return;
    try {
      const clientiResponse = await api.get(`/items/${CLIENTI_COLLECTION}`, {
        params: {
          fields: ['id', 'id_user'],
          filter: { azienda: { _eq: selectedAzienda.value } },
          limit: 1,
        },
      });
      const clientiRows = clientiResponse?.data?.data ?? [];
      const clienteRow = clientiRows[0];
      if (clienteRow) {
        selectedClienteId.value = clienteRow.id ?? null;
        selectedClienteIdUser.value = clienteRow.id_user ?? null;
      }
      // Carica chiamate_automatiche e id_google_fogli da chiamate_outbound
      const outboundFilter = { azienda: { _eq: selectedAzienda.value } };
      if (selectedClienteIdUser.value != null) outboundFilter.id_user = { _eq: selectedClienteIdUser.value };
      const outboundResponse = await api.get(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, {
        params: {
          fields: ['id', 'chiamate_automatiche', 'id_google_fogli'],
          filter: outboundFilter,
          limit: 1,
        },
      });
      const outboundRows = outboundResponse?.data?.data ?? [];
      const outboundRow = outboundRows[0];
      if (outboundRow) {
        selectedChiamateOutboundId.value = outboundRow.id ?? null;
        chiamateAutomatiche.value = outboundRow.chiamate_automatiche === true || outboundRow.chiamate_automatiche === 1;
        const value = outboundRow.id_google_fogli;
        if (value && typeof value === 'string' && value.trim()) {
          const url = value.trim();
          selectedGoogleFoglioUrl.value = url.startsWith('http') ? url : `https://docs.google.com/spreadsheets/d/${value}/edit`;
        }
      }
    } catch (err) {
      console.error('Error loading clienti / chiamate_outbound:', err);
    }
  }

  function openGoogleFoglio() {
    if (!selectedGoogleFoglioUrl.value) return;
    window.open(selectedGoogleFoglioUrl.value, '_blank', 'noopener,noreferrer');
  }

  async function toggleChiamateAutomatiche() {
    if (!selectedAzienda.value) return;
    chiamateAutomaticheLoading.value = true;
    const nextValue = !chiamateAutomatiche.value;
    try {
      const outboundId = selectedChiamateOutboundId.value;
      if (outboundId) {
        await api.patch(`/items/${CHIAMATE_OUTBOUND_COLLECTION}/${outboundId}`, {
          chiamate_automatiche: nextValue,
        });
      } else {
        const payload = {
          azienda: selectedAzienda.value,
          id_user: selectedClienteIdUser.value ?? null,
          chiamate_automatiche: nextValue,
        };
        const createRes = await api.post(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, payload);
        const created = createRes?.data?.data;
        if (created?.id) selectedChiamateOutboundId.value = created.id;
      }
      chiamateAutomatiche.value = nextValue;
    } catch (err) {
      console.error('Error updating chiamate_automatiche (chiamate_outbound):', err);
      const msg = err?.response?.data?.errors?.[0]?.message ?? err?.message ?? 'Impossibile aggiornare. Riprova.';
      chiamateAutomaticheError.value = msg;
      setTimeout(() => { chiamateAutomaticheError.value = null; }, 5000);
    } finally {
      chiamateAutomaticheLoading.value = false;
    }
  }

  return {
    aziende,
    aziendeLoading,
    aziendeError,
    selectedAzienda,
    drawerOpen,
    drawerTitle,
    selectedGoogleFoglioUrl,
    selectedClienteId,
    selectedClienteIdUser,
    selectedChiamateOutboundId,
    chiamateAutomatiche,
    chiamateAutomaticheLoading,
    chiamateAutomaticheError,
    loadAziende,
    selectAzienda,
    loadGoogleFoglioUrl,
    openGoogleFoglio,
    toggleChiamateAutomatiche,
  };
}
