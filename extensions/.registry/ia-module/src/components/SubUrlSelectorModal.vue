<template>
  <v-dialog :model-value="open" @update:model-value="handleDialogUpdate" @esc="$emit('close')" persistent>
    <v-card class="suburl-modal">
      <v-card-title class="modal-title">
        <v-icon name="link" />
        <span class="modal-title-text">Seleziona i link da processare</span>
      </v-card-title>

      <v-card-text style="padding: 0;">
        <div v-if="loading" class="loading-container">
          <v-progress-circular indeterminate />
          <span>{{ loadingMessage }}</span>
        </div>

        <div v-else-if="error" class="error-container">
          <v-icon name="error" />
          <span>{{ error }}</span>
        </div>

        <div v-else-if="subUrls.length === 0" class="empty-container">
          <v-icon name="link_off" />
          <span>Nessun link trovato</span>
        </div>

        <div v-else class="links-container">
          <div class="links-header">
            <span class="links-count">{{ selectedCount }} / {{ subUrls.length }} selezionati</span>
            <div class="links-actions">
              <button type="button" class="btn-link" @click="selectAll">
                Seleziona tutto
              </button>
              <button type="button" class="btn-link" @click="deselectAll">
                Deseleziona tutto
              </button>
            </div>
          </div>

          <div class="links-list">
            <div
              v-for="item in subUrls"
              :key="item.id"
              class="link-item"
              :class="{ selected: selectedIds.includes(item.id) }"
              @click="toggleSelection(item.id)"
            >
              <input
                type="checkbox"
                :checked="selectedIds.includes(item.id)"
                @click.stop="toggleSelection(item.id)"
                @change.prevent
              />
              <div class="link-content">
                <span class="link-url">{{ item.url || item.sottourl || 'N/A' }}</span>
                <span v-if="item.to_process" class="link-badge">Già processato</span>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>

      <div class="modal-actions">
        <v-button @click="$emit('close')" secondary>Annulla</v-button>
        <v-button
          @click="handleConfirm"
          :disabled="loading || selectedIds.length === 0 || processing"
          :loading="processing"
        >
          {{ processing ? 'Elaborazione...' : 'Conferma' }}
        </v-button>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const props = defineProps({
  open: { type: Boolean, default: false },
  parentUrlId: { type: [String, Number], default: null },
});

const emit = defineEmits(['update:open', 'close', 'confirmed', 'timeout']);

const api = useApi();
const subUrls = ref([]);
const loading = ref(false);
const processing = ref(false);
const error = ref('');
const selectedIds = ref([]);
const loadingMessage = ref('Caricamento link...');
const pollTimeout = ref(null);

const selectedCount = computed(() => selectedIds.value.length);

function handleDialogUpdate(value) {
  // Previeni la chiusura quando si clicca fuori, ma permetti la chiusura programmatica
  if (!value && props.open) {
    // Se il dialog sta cercando di chiudersi per click esterno, previenilo
    // Ma se viene chiuso programmaticamente (da @esc o da close), permetti
    return;
  }
  emit('update:open', value);
}

async function loadSubUrls() {
  if (!props.parentUrlId) return;

  loading.value = true;
  error.value = '';
  loadingMessage.value = 'Caricamento in corso...';

  const startTime = Date.now();
  const timeout = 50000; // 50 secondi

  try {
    while (Date.now() - startTime < timeout) {
      try {
        // Legge il record principale per ottenere il JSON in sottourl
        const response = await api.get(`/items/sitoweb/${props.parentUrlId}`, {
          params: {
            fields: ['id', 'sottourl', 'url'],
          },
        });

        const item = response?.data?.data;
        
        if (item && item.sottourl) {
          // Prova a parsare il JSON
          let parsedSubUrls = [];
          
          try {
            // Se è già un oggetto/array, usalo direttamente
            if (Array.isArray(item.sottourl)) {
              parsedSubUrls = item.sottourl;
            } else if (typeof item.sottourl === 'string') {
              // Se è una stringa, prova a parsarla come JSON
              parsedSubUrls = JSON.parse(item.sottourl);
            } else if (typeof item.sottourl === 'object') {
              // Se è un oggetto, convertilo in array
              parsedSubUrls = Object.values(item.sottourl);
            }
          } catch (parseError) {
            // Se il parsing fallisce, aspetta ancora
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }

          // Normalizza i link per la visualizzazione, ma mantiene tutti i campi originali
          if (Array.isArray(parsedSubUrls) && parsedSubUrls.length > 0) {
            subUrls.value = parsedSubUrls.map((link, index) => {
              // Se il link è una stringa, convertilo in oggetto per la visualizzazione
              // ma nel salvataggio manterremo il formato originale
              if (typeof link === 'string') {
                return {
                  id: `link_${index}`,
                  url: link,
                  to_process: false,
                  _original: link, // Mantiene il riferimento originale
                };
              }
              // Se è già un oggetto, mantiene tutti i campi esistenti
              // Usa un ID univoco basato su id, url, o indice
              const linkId = link.id || link.url || `link_${index}`;
              return {
                ...link, // Mantiene tutti i campi originali
                id: linkId, // Assicura che ci sia sempre un id per la selezione
                to_process: link.to_process !== undefined ? link.to_process : false,
              };
            });

            if (subUrls.value.length > 0) {
              loading.value = false;
              return;
            }
          }
        }

        // Aspetta 500ms prima di riprovare
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        // Se è un errore 404, il record non esiste ancora
        if (e?.response?.status === 404) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        // Se è un errore di rete, continua a riprovare
        if (e?.response?.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw e;
      }
    }

    // Timeout raggiunto
    if (subUrls.value.length === 0) {
      error.value = 'Nessun link trovato entro il timeout';
      loading.value = false;
      // Emetti evento per eliminare il record in caso di timeout
      emit('timeout', props.parentUrlId);
    }
  } catch (e) {
    error.value = e?.message || 'Errore durante il caricamento dei link';
    loading.value = false;
    // Emetti evento per eliminare il record in caso di errore
    emit('timeout', props.parentUrlId);
  }
}

function toggleSelection(id) {
  const index = selectedIds.value.indexOf(id);
  if (index === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(index, 1);
  }
}

function selectAll() {
  // Seleziona solo i link che non sono già processati
  selectedIds.value = subUrls.value
    .filter(item => !item.to_process)
    .map(item => item.id);
}

function deselectAll() {
  selectedIds.value = [];
}

async function handleConfirm() {
  if (selectedIds.value.length === 0 || processing.value || !props.parentUrlId) return;

  processing.value = true;
  try {
    // Legge il record corrente per ottenere il JSON attuale
    const response = await api.get(`/items/sitoweb/${props.parentUrlId}`, {
      params: {
        fields: ['id', 'sottourl'],
      },
    });

    const item = response?.data?.data;
    if (!item || !item.sottourl) {
      throw new Error('Record non trovato o sottourl non disponibile');
    }

    // Mantiene il formato originale del JSON (può essere array, stringa, o oggetto)
    let parsedSubUrls;
    let originalFormat = 'array'; // 'array', 'string', 'object'
    
    try {
      if (Array.isArray(item.sottourl)) {
        parsedSubUrls = [...item.sottourl];
        originalFormat = 'array';
      } else if (typeof item.sottourl === 'string') {
        // Se è una stringa, la parsa e poi la riconvertirà in stringa
        parsedSubUrls = JSON.parse(item.sottourl);
        originalFormat = 'string';
      } else if (typeof item.sottourl === 'object' && item.sottourl !== null) {
        // Se è un oggetto, convertilo in array mantenendo la struttura
        parsedSubUrls = Array.isArray(item.sottourl) ? [...item.sottourl] : Object.values(item.sottourl);
        originalFormat = 'object';
      } else {
        throw new Error('Formato sottourl non supportato');
      }
    } catch (parseError) {
      throw new Error('Errore nel parsing del JSON sottourl');
    }

    // Aggiorna solo to_process a true per i link selezionati, mantenendo tutti gli altri campi
    parsedSubUrls = parsedSubUrls.map((link, index) => {
      const linkId = link.id || link.url || `link_${index}`;
      if (selectedIds.value.includes(linkId)) {
        // Mantiene tutti i campi esistenti e cambia solo to_process
        return {
          ...link,
          to_process: true,
        };
      }
      // Mantiene il link esattamente come è, senza modifiche
      return link;
    });

    // Riconverte nel formato originale
    let finalSubUrls;
    if (originalFormat === 'string') {
      finalSubUrls = JSON.stringify(parsedSubUrls);
    } else if (originalFormat === 'object') {
      // Se era un oggetto, lo riconverte (puoi adattare questa logica se necessario)
      finalSubUrls = parsedSubUrls;
    } else {
      finalSubUrls = parsedSubUrls;
    }

    // Salva il JSON aggiornato nel campo sottourl, mantenendo la struttura originale
    await api.patch(`/items/sitoweb/${props.parentUrlId}`, {
      sottourl: finalSubUrls,
    });

    emit('confirmed', selectedIds.value);
    emit('update:open', false);
    emit('close');
  } catch (e) {
    error.value = e?.message || 'Errore durante l\'aggiornamento dei link';
  } finally {
    processing.value = false;
  }
}

function reset() {
  subUrls.value = [];
  selectedIds.value = [];
  error.value = '';
  loading.value = false;
  processing.value = false;
}

watch(
  () => props.open,
  (newVal) => {
    if (newVal && props.parentUrlId) {
      reset();
      loadSubUrls();
    } else if (!newVal) {
      reset();
      if (pollTimeout.value) {
        clearTimeout(pollTimeout.value);
        pollTimeout.value = null;
      }
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.suburl-modal {
  width: 1000px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 24px 32px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
}

.modal-title :deep(.v-icon) {
  width: 24px;
  height: 24px;
  color: #5e72e4;
}

.modal-title-text {
  font-weight: 700;
  font-size: 20px;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.02em;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 80px 40px;
  color: var(--foreground-subdued, #6b7280);
  min-height: 300px;
}

.loading-container :deep(.v-progress-circular) {
  width: 48px;
  height: 48px;
}

.loading-container span {
  font-size: 16px;
  font-weight: 500;
}

.error-container {
  color: #ef4444;
}

.error-container :deep(.v-icon) {
  width: 48px;
  height: 48px;
  color: #ef4444;
}

.error-container span {
  font-size: 15px;
  font-weight: 500;
}

.empty-container :deep(.v-icon) {
  width: 64px;
  height: 64px;
  color: var(--foreground-subdued, #9ca3af);
  opacity: 0.5;
}

.empty-container span {
  font-size: 15px;
  font-weight: 500;
}

.links-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 32px;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--background-page, #f9fafb);
}

.links-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.links-count {
  font-weight: 600;
  font-size: 15px;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.01em;
}

.links-actions {
  display: flex;
  gap: 12px;
}

.btn-link {
  background: var(--background, #ffffff);
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  color: #5e72e4;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  letter-spacing: -0.01em;
}

.btn-link:hover {
  background: var(--background-subdued, #f9fafb);
  border-color: #5e72e4;
  box-shadow: 0 2px 4px rgba(94, 114, 228, 0.15);
  transform: translateY(-1px);
}

.btn-link:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 2px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.link-item:hover {
  border-color: #5e72e4;
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.05) 0%, #ffffff 100%);
  box-shadow: 0 4px 8px rgba(94, 114, 228, 0.15);
  transform: translateY(-1px);
}

.link-item.selected {
  border-color: #5e72e4;
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.12) 0%, rgba(124, 141, 232, 0.08) 100%);
  box-shadow: 0 4px 12px rgba(94, 114, 228, 0.2);
}

.link-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #5e72e4;
  flex-shrink: 0;
}

.link-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.link-url {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--foreground, #1a1a1a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.link-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
  letter-spacing: 0.3px;
}

.modal-actions {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: 12px;
  padding: 24px 32px;
  border-top: 1px solid var(--border-normal, #e8e8e8);
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}

.modal-actions :deep(*) {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  gap: 12px;
}

.modal-actions :deep(.v-button) {
  min-width: 140px;
  width: auto;
  height: 44px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin: 0 !important;
}

.modal-actions :deep(.v-button--secondary) {
  background: var(--background, #ffffff);
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  color: var(--foreground, #1a1a1a);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.modal-actions :deep(.v-button--secondary:hover) {
  background: var(--background-subdued, #f9fafb);
  border-color: var(--border-color, #d1d5db);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.modal-actions :deep(.v-button--primary) {
  background: linear-gradient(135deg, #5e72e4 0%, #7c8de8 100%);
  border: 1px solid #5e72e4;
  box-shadow: 0 1px 2px rgba(94, 114, 228, 0.2), 0 1px 3px rgba(94, 114, 228, 0.1);
}

.modal-actions :deep(.v-button--primary:hover:not(:disabled)) {
  box-shadow: 0 4px 6px rgba(94, 114, 228, 0.25), 0 2px 4px rgba(94, 114, 228, 0.15);
  transform: translateY(-1px);
}

.modal-actions :deep(.v-button--primary:active:not(:disabled)) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(94, 114, 228, 0.2);
}

/* Scrollbar personalizzata */
.links-container::-webkit-scrollbar {
  width: 10px;
}

.links-container::-webkit-scrollbar-track {
  background: var(--background-subdued, #f9fafb);
  border-radius: 5px;
}

.links-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 5px;
  border: 2px solid var(--background-subdued, #f9fafb);
}

.links-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
