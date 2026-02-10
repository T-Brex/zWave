import { ref, computed, watch, unref } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';

const CLIENTI_COLLECTION = 'clienti';
const ADMIN_STORAGE_KEY = 'azienda_admin_selected';
const USER_STORAGE_PREFIX = 'azienda_user_';

export function useAziende() {
  const api = useApi();
  const { useUserStore } = useStores();
  const userStore = useUserStore();
  const availableAziende = ref([]);
  const aziendaUserMap = ref({});
  const selectedAzienda = ref(null);
  const loadingAziende = ref(false);
  const error = ref(null);

  const isAdmin = computed(() => {
    const roleName = String(userStore.currentUser?.role?.name || '').toLowerCase();
    return (
      !!userStore.currentUser?.role?.admin_access ||
      roleName.includes('admin') ||
      roleName.includes('ammin')
    );
  });
  const storageKey = computed(() => {
    if (isAdmin.value) return ADMIN_STORAGE_KEY;
    const userId = userStore.currentUser?.id;
    return userId ? `${USER_STORAGE_PREFIX}${userId}` : ADMIN_STORAGE_KEY;
  });

  const resolveStorageKey = () => {
    const key = unref(storageKey);
    return key || ADMIN_STORAGE_KEY;
  };

  const setSelectedAzienda = (azienda) => {
    selectedAzienda.value = azienda;
    if (typeof window === 'undefined') return;
    const key = resolveStorageKey();
    if (!key) return;
    if (azienda) {
      localStorage.setItem(key, azienda);
    } else {
      localStorage.removeItem(key);
    }
  };

  const loadFromStorage = (key) => {
    if (typeof window === 'undefined' || !key) return;
    const saved = localStorage.getItem(key);
    selectedAzienda.value = saved || null;
  };

  loadFromStorage(resolveStorageKey());

  watch(
    () => resolveStorageKey(),
    (newKey, oldKey) => {
      if (!newKey || newKey === oldKey) return;
      loadFromStorage(newKey);
    }
  );

  async function loadAziende() {
    loadingAziende.value = true;
    error.value = null;
    try {
      const admin = isAdmin.value;
      const roleName = String(userStore.currentUser?.role?.name || '').toLowerCase();
      const isClientRole =
        roleName.includes('client') ||
        roleName.includes('cliente') ||
        roleName.includes('customer') ||
        roleName.includes('utente') ||
        roleName.includes('user');
      const params = {
        fields: ['id', 'azienda', 'id_user'],
        limit: -1,
        filter: {
          azienda: { _nnull: true }
        }
      };
      if (!admin && isClientRole && userStore.currentUser?.id) {
        params.filter.id_user = { _eq: userStore.currentUser.id };
      }
      const aziendeRes = await api.get(`/items/${CLIENTI_COLLECTION}`, { params });

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

      if (!admin && aziendeArray.length > 0) {
        setSelectedAzienda(aziendeArray[0].value);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ia_module_selected_azienda');
        }
        return;
      }

      const availableValues = new Set(availableAziende.value.map(a => a.value));
      const currentSelection = selectedAzienda.value?.trim();
      if (currentSelection && !availableValues.has(currentSelection)) {
        if (aziendeArray.length > 0) {
          setSelectedAzienda(aziendeArray[0].value);
        } else {
          setSelectedAzienda(null);
        }
      }

      if (admin && !selectedAzienda.value && aziendeArray.length > 0) {
        setSelectedAzienda(aziendeArray[0].value);
      }

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
    setSelectedAzienda(azienda);
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
