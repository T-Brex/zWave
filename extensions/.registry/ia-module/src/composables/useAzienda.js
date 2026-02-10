import { ref, provide, inject, unref, watch } from 'vue';

const AZIENDA_KEY = Symbol('azienda');
const DEFAULT_STORAGE_KEY = 'azienda_admin_selected';

export function useAzienda(options = {}) {
  const selectedAzienda = ref(null);
  const { storageKey } = options;

  const resolveStorageKey = () => unref(storageKey) || DEFAULT_STORAGE_KEY;

  function loadFromStorage(key) {
    if (typeof window === 'undefined' || !key) return;
    const saved = localStorage.getItem(key);
    selectedAzienda.value = saved || null;
  }

  loadFromStorage(resolveStorageKey());

  watch(
    () => resolveStorageKey(),
    (newKey, oldKey) => {
      if (!newKey || newKey === oldKey) return;
      loadFromStorage(newKey);
    }
  );

  function setAzienda(azienda) {
    selectedAzienda.value = azienda;
    if (typeof window !== 'undefined') {
      const key = resolveStorageKey();
      if (!key) return;
      if (azienda) {
        localStorage.setItem(key, azienda);
      } else {
        localStorage.removeItem(key);
      }
    }
  }

  function getAzienda() {
    return selectedAzienda.value;
  }

  return {
    selectedAzienda,
    setAzienda,
    getAzienda,
  };
}

export function provideAzienda(aziendaContext) {
  provide(AZIENDA_KEY, aziendaContext);
}

export function injectAzienda() {
  const azienda = inject(AZIENDA_KEY, null);
  if (!azienda) {
    // Fallback: crea un contesto vuoto se non fornito
    return {
      selectedAzienda: ref(null),
      setAzienda: () => {},
    };
  }
  return azienda;
}
