<template>
  <div class="site-tab">
    <div class="site-header">
      <input
        v-model="search"
        class="site-search"
        placeholder="Cerca sito…"
      />
    </div>

    <div class="site-add">
      <input
        v-model="urlInput"
        class="site-url"
        placeholder="Inserisci un link (es. https://www.esempio.it)"
      />
      <button class="btn-primary" type="button" @click="addUrl" :disabled="saving">
        {{ saving ? 'Salvataggio…' : 'Aggiungi' }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="site-loading">
      <v-progress-circular indeterminate />
      <span>Caricamento siti…</span>
    </div>

    <div v-else-if="!filteredSites.length" class="no-results">
      Nessun sito trovato
    </div>

    <div class="site-list">
      <div
        v-for="site in filteredSites"
        :key="site.id"
        class="site-card"
      >
        <div class="site-content">
          <h4>{{ site.url }}</h4>
        </div>
        <div class="site-actions-inline">
          <!-- Caricamento link in corso -->
          <div
            v-if="isSiteLoadingLinks(site)"
            class="links-loading-indicator"
            title="Ricerca link in corso…"
          >
            <v-progress-circular indeterminate size="20" />
            <span class="links-loading-text">Ricerca link…</span>
          </div>
          <!-- Link trovati: icona verde cliccabile per aprire selezione -->
          <button
            v-else-if="hasLinks(site)"
            type="button"
            class="icon-btn links-ready"
            title="Seleziona link da processare"
            @click="openSubUrlModal(site)"
          >
            <CheckCircleIcon class="icon icon-success" />
          </button>
          <button
            type="button"
            class="icon-btn delete"
            title="Elimina sito"
            @click="deleteSite(site)"
          >
            <TrashIcon class="icon" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal selezione sottourl (aperta al click sull'icona verde) -->
    <SubUrlSelectorModal
      :open="subUrlModalOpen"
      :parent-url-id="selectedSiteIdForSubUrls"
      @update:open="subUrlModalOpen = $event"
      @close="closeSubUrlModal"
      @confirmed="handleSubUrlsConfirmed"
      @timeout="handleSubUrlTimeout"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { TrashIcon } from '@heroicons/vue/24/outline';
import { CheckCircleIcon } from '@heroicons/vue/24/solid';
import { injectAzienda } from '../../composables/useAzienda';
import SubUrlSelectorModal from '../../components/SubUrlSelectorModal.vue';

const api = useApi();
const selectedAzienda = injectAzienda();
const SITO_WEB_COLLECTION = 'sitoweb';

/** Tempo massimo per ricevere i link dopo l'inserimento di un URL (5 minuti). */
const LINK_DISCOVERY_TIMEOUT_MS = 5 * 60 * 1000;

const sites = ref([]);
const loading = ref(false);
const search = ref('');
const saving = ref(false);
const error = ref('');
const urlInput = ref('');
const subUrlModalOpen = ref(false);
const selectedSiteIdForSubUrls = ref(null);
const linkingSites = ref(new Set());
const linkPollIntervals = ref(new Map());
const linkPollTimeouts = ref(new Map()); // Timeout 5 min per siti appena inseriti

const filteredSites = computed(() => {
  if (!search.value) return sites.value;
  const q = search.value.toLowerCase();
  return sites.value.filter((site) =>
    String(site?.url || '').toLowerCase().includes(q)
  );
});

/** True se il record ha almeno un link in sottourl (link scoperti). */
function hasLinks(site) {
  const s = site?.sottourl;
  if (s == null) return false;
  if (Array.isArray(s)) return s.length > 0;
  if (typeof s === 'string') {
    if (s.trim().length < 2) return false;
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed.length > 0 : !!parsed;
    } catch {
      return false;
    }
  }
  if (typeof s === 'object') return Object.keys(s).length > 0;
  return false;
}

/** True se il sito è in attesa di scoperta link (polling attivo, link non ancora pronti). */
function isSiteLoadingLinks(site) {
  return site?.id && linkingSites.value.has(site.id);
}

async function loadSites() {
  loading.value = true;
  try {
    const params = {
      limit: 100,
      sort: ['-date_created'],
      fields: ['id', 'url', 'upload', 'azienda', 'date_created', 'delete', 'sottourl'],
    };

    const filterConditions = {
      delete: { _neq: true },
    };
    if (selectedAzienda.selectedAzienda?.value) {
      filterConditions.azienda = { _eq: selectedAzienda.selectedAzienda.value };
    }
    params.filter = filterConditions;

    const res = await api.get(`/items/${SITO_WEB_COLLECTION}`, { params });
    const data = res?.data?.data ?? [];
    sites.value = data;
    error.value = '';

    data.forEach((site) => {
      if (site.id && !hasLinks(site) && !linkingSites.value.has(site.id)) {
        startLinkPolling(site.id);
      } else if (hasLinks(site) && linkingSites.value.has(site.id)) {
        stopLinkPolling(site.id);
      }
    });
  } catch (e) {
    sites.value = [];
    error.value = 'Errore caricamento siti';
  } finally {
    loading.value = false;
  }
}

/**
 * Avvia il polling per la scoperta dei link (sottourl).
 * @param {number|string} siteId - ID del record sitoweb
 * @param {{ enforceTimeout?: boolean }} options - Se enforceTimeout: true, dopo 5 min senza link il sito viene rimosso
 */
function startLinkPolling(siteId, options = {}) {
  if (linkPollIntervals.value.has(siteId)) return;

  linkingSites.value = new Set([...linkingSites.value, siteId]);

  const intervalId = setInterval(async () => {
    try {
      const res = await api.get(`/items/${SITO_WEB_COLLECTION}/${siteId}`, {
        params: { fields: ['id', 'sottourl', 'upload'] },
      });
      const item = res?.data?.data;
      if (!item) return;

      if (hasLinks(item)) {
        stopLinkPolling(siteId);
        const index = sites.value.findIndex((s) => s.id === siteId);
        if (index !== -1) {
          sites.value[index] = { ...sites.value[index], ...item };
        }
      }
    } catch (e) {
      console.error('Polling sottourl:', e);
    }
  }, 2000);

  linkPollIntervals.value.set(siteId, intervalId);

  if (options.enforceTimeout) {
    const timeoutId = setTimeout(() => {
      if (!linkingSites.value.has(siteId)) return; // Link già arrivati
      stopLinkPolling(siteId);
      linkPollTimeouts.value.delete(siteId);
      removeSiteAfterTimeout(siteId);
    }, LINK_DISCOVERY_TIMEOUT_MS);
    linkPollTimeouts.value.set(siteId, timeoutId);
  }
}

/** Rimuove il sito dopo timeout (link non ricevuti entro 5 min) e mostra messaggio. */
async function removeSiteAfterTimeout(siteId) {
  const site = sites.value.find((s) => s.id === siteId);
  const urlDisplay = site?.url || 'questo sito';
  sites.value = sites.value.filter((s) => s.id !== siteId);
  error.value = `Impossibile recuperare i link per "${urlDisplay}" entro 5 minuti. Il sito non è stato inserito. Verifica l'URL e riprova.`;
  try {
    await api.delete(`/items/${SITO_WEB_COLLECTION}/${siteId}`);
  } catch (e) {
    console.error('Rimozione sito dopo timeout:', e);
  }
}

function stopLinkPolling(siteId) {
  const timeoutId = linkPollTimeouts.value.get(siteId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    linkPollTimeouts.value.delete(siteId);
  }
  const intervalId = linkPollIntervals.value.get(siteId);
  if (intervalId) {
    clearInterval(intervalId);
    linkPollIntervals.value.delete(siteId);
  }
  const next = new Set(linkingSites.value);
  next.delete(siteId);
  linkingSites.value = next;
}

function openSubUrlModal(site) {
  if (!site?.id) return;
  selectedSiteIdForSubUrls.value = site.id;
  subUrlModalOpen.value = true;
}

async function addUrl() {
  if (saving.value) return;
  const url = urlInput.value.trim();
  if (!url) {
    error.value = 'Inserisci un URL valido';
    return;
  }
  saving.value = true;
  error.value = '';
  let created = null;
  
  // Prepara il payload con azienda se selezionata
  const basePayload = { url };
  if (selectedAzienda.selectedAzienda?.value) {
    basePayload.azienda = selectedAzienda.selectedAzienda.value;
    
    // Recupera id_agente, id_user e id_branch dalla collection clienti
    try {
      const clientiRes = await api.get('/items/clienti', {
        params: {
          filter: {
            azienda: {
              _eq: selectedAzienda.selectedAzienda.value,
            },
          },
          fields: ['agent_elevenlabs', 'id_user', 'id_branch'],
          limit: 1,
        },
      });
      
      const cliente = clientiRes?.data?.data?.[0];
      if (cliente) {
        // Aggiungi id_agente, id_user e id_branch al payload
        if (cliente.agent_elevenlabs) {
          basePayload.id_agente = cliente.agent_elevenlabs;
        }
        if (cliente.id_user) {
          basePayload.id_user = cliente.id_user;
        }
        if (cliente.id_branch) {
          basePayload.id_branch = cliente.id_branch;
        }
      }
    } catch (e) {
      console.warn('Errore nel recupero dati cliente:', e);
      // Continua comunque con la creazione anche se non si riesce a recuperare i dati del cliente
    }
  }
  
  try {
    try {
      created = (await api.post(`/items/${SITO_WEB_COLLECTION}`, basePayload))?.data?.data;
    } catch (e) {
      const fallbackPayload = {
        nome: url,
        url,
      };
      if (selectedAzienda.selectedAzienda?.value) {
        fallbackPayload.azienda = selectedAzienda.selectedAzienda.value;
        
        // Aggiungi anche id_agente, id_user e id_branch al fallback payload se disponibili
        if (basePayload.id_agente) {
          fallbackPayload.id_agente = basePayload.id_agente;
        }
        if (basePayload.id_user) {
          fallbackPayload.id_user = basePayload.id_user;
        }
        if (basePayload.id_branch) {
          fallbackPayload.id_branch = basePayload.id_branch;
        }
      }
      created = (await api.post(`/items/${SITO_WEB_COLLECTION}`, fallbackPayload))?.data?.data;
    }
    
    if (created?.id) {
      urlInput.value = '';
      search.value = '';
      sites.value = [created, ...sites.value];
      startLinkPolling(created.id, { enforceTimeout: true });
    }
  } catch (e) {
    error.value = e?.message || 'Errore durante il salvataggio. Il sito non è stato salvato.';
  } finally {
    saving.value = false;
  }
}

function closeSubUrlModal() {
  subUrlModalOpen.value = false;
  selectedSiteIdForSubUrls.value = null;
}

function handleSubUrlsConfirmed() {
  closeSubUrlModal();
  loadSites();
}

function handleSubUrlTimeout() {
  error.value = 'Impossibile caricare i link. Riprova più tardi.';
  closeSubUrlModal();
}

async function deleteSite(site) {
  const ok = confirm(`Eliminare "${site.url}"?`);
  if (!ok) return;
  error.value = '';
  const id = site.id;
  
  try {
    // 1. Imposta delete: true immediatamente (rimuove dall'interfaccia)
    await api.patch(`/items/${SITO_WEB_COLLECTION}/${id}`, {
      delete: true
    });
    
    // Rimuovi immediatamente dall'interfaccia
    sites.value = sites.value.filter((item) => item.id !== site.id);
    
    // 2. Dopo 10 secondi, elimina effettivamente dalla collection
    setTimeout(async () => {
      try {
        await api.delete(`/items/${SITO_WEB_COLLECTION}/${id}`);
      } catch (e) {
        console.error('Errore durante eliminazione definitiva del sito:', e);
        // Non mostrare errore all'utente perché l'interfaccia è già aggiornata
      }
    }, 10000); // 10 secondi
  } catch (e) {
    error.value = e?.message || 'Errore durante eliminazione sito';
  }
}

onMounted(loadSites);

watch(() => selectedAzienda.selectedAzienda?.value, () => {
  [...linkPollIntervals.value.keys()].forEach((siteId) => stopLinkPolling(siteId));
  loadSites();
}, { immediate: false });

onUnmounted(() => {
  [...linkPollIntervals.value.keys()].forEach((siteId) => stopLinkPolling(siteId));
});
</script>

<style scoped>
.site-tab {
  display: grid;
  gap: 20px;
}

.site-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
  flex-wrap: wrap;
}

.site-search {
  width: 360px;
  height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  font: inherit;
  font-size: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--background, #ffffff);
  color: var(--foreground, #1a1a1a);
}

.site-search:focus {
  outline: none;
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
}

.site-add {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.site-url {
  flex: 1;
  min-width: 520px;
  height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  font: inherit;
  font-size: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--background, #ffffff);
  color: var(--foreground, #1a1a1a);
}

.site-url:focus {
  outline: none;
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
}

.btn-primary {
  height: 44px;
  background: linear-gradient(135deg, #5e72e4 0%, #7c8de8 100%);
  color: white;
  border-radius: 10px;
  border: 1px solid #5e72e4;
  padding: 0 20px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(94, 114, 228, 0.2), 0 1px 3px rgba(94, 114, 228, 0.1);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 6px rgba(94, 114, 228, 0.25), 0 2px 4px rgba(94, 114, 228, 0.15);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(94, 114, 228, 0.2);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.site-list {
  display: grid;
  gap: 12px;
}

.site-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.site-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  border-color: var(--border-color, #d1d5db);
}

.site-content {
  flex: 1;
  padding-right: 16px;
  min-width: 0;
}

.site-content h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.01em;
}

.site-actions-inline {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.icon-btn:hover {
  background: var(--background-subdued, #f9fafb);
  border-color: var(--border-color, #d1d5db);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.icon-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.icon {
  width: 18px;
  height: 18px;
}

.icon-btn.delete {
  color: #ef4444;
}

.icon-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.links-loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.links-loading-text {
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
  font-weight: 500;
}

.icon-btn.links-ready {
  color: #059669;
}

.icon-btn.links-ready:hover {
  background: rgba(5, 150, 105, 0.1);
  border-color: #059669;
}

.icon-btn .icon-success {
  width: 22px;
  height: 22px;
}

.error {
  color: #ef4444;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin-top: 8px;
}
</style>
