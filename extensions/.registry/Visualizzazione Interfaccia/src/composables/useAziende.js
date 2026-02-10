import { ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const CLIENTI_COLLECTION = 'clienti';

export function useAziende() {
  const api = useApi();
  const availableAziende = ref([]);
  const aziendaUserMap = ref({});
  const selectedAzienda = ref(null);
  const loadingAziende = ref(false);
  const error = ref(null);

  async function loadAziende() {
    loadingAziende.value = true;
    error.value = null;
    try {
      const aziendeRes = await api.get(`/items/${CLIENTI_COLLECTION}`, {
        params: {
          fields: ['id', 'azienda', 'id_user'],
          limit: -1,
          filter: {
            azienda: { _nnull: true }
          }
        }
      });

      const items = aziendeRes.data?.data || aziendeRes.data || [];
      const userMap = {};
      const aziendeSet = new Set();
      items.forEach(item => {
        const azienda = item?.azienda;
        const rawUserId = item?.id_user?.id ?? item?.id_user ?? null;
        if (azienda && String(azienda).trim()) {
          const trimmed = String(azienda).trim();
          aziendeSet.add(trimmed);
          if (rawUserId && !userMap[trimmed]) {
            userMap[trimmed] = rawUserId;
          }
        }
      });

      const aziendeArray = Array.from(aziendeSet)
        .sort((a, b) => a.localeCompare(b, 'it'))
        .map(a => ({ value: a, label: a }));

      availableAziende.value = aziendeArray;
      aziendaUserMap.value = userMap;

      if (aziendeArray.length === 0) {
        error.value = 'Nessuna azienda trovata nella collection clienti. Verifica che il campo "azienda" esista e contenga valori.';
      }
    } catch (err) {
      console.error('Errore nel caricamento delle aziende:', err);
      const status = err.response?.status;
      if (status === 403) {
        error.value = 'Accesso negato alla collection clienti. Verifica i permessi.';
      } else if (status === 404) {
        error.value = 'Collection "clienti" non trovata. Verifica che la collection esista.';
      } else {
        error.value = `Errore nel caricamento delle aziende: ${err.message || 'Errore sconosciuto'}`;
      }
      availableAziende.value = [];
      aziendaUserMap.value = {};
    } finally {
      loadingAziende.value = false;
    }
  }

  function selectAzienda(azienda) {
    selectedAzienda.value = azienda;
  }

  return {
    availableAziende,
    aziendaUserMap,
    selectedAzienda,
    loadingAziende,
    error,
    loadAziende,
    selectAzienda
  };
}
