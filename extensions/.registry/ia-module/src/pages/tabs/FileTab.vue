<template>
  <div class="file-tab">

    <!-- Header -->
    <div class="file-header">
      <input
        v-model="search"
        class="file-search"
        placeholder="Cerca file..."
      />
    </div>

    <div
      class="file-upload"
      :class="{ 'is-dragging': isDragging, 'is-uploading': uploading }"
      role="button"
      tabindex="0"
      @click="triggerFilePicker"
      @keydown.enter="triggerFilePicker"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" class="file-input" type="file" @change="onFileChange" />
      <div class="file-upload-content">
        <div class="file-upload-row">
          <ArrowUpTrayIcon class="upload-icon" />
          <div class="file-upload-title">Trascina un file qui o clicca per caricare</div>
        </div>
        <div class="file-upload-subtitle">Il file verra aggiunto automaticamente</div>
      </div>
      <div v-if="uploading" class="file-upload-status">Caricamento...</div>
    </div>
    <p v-if="uploadError" class="upload-error">{{ uploadError }}</p>

    <!-- Loading -->
    <div v-if="loading" class="file-loading">
      <v-progress-circular indeterminate />
      <span>Caricamento file…</span>
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredFiles.length" class="no-results">
      Nessun file trovato
    </div>

    <div class="file-grid">
      <div
        v-for="item in filteredFiles"
        :key="item.id"
        class="file-card"
      >
        <div class="file-content">
          <h4>{{ item.file?.filename_download || 'File senza nome' }}</h4>
          <p class="preview">{{ item.file?.type }}</p>
        </div>

        <div class="file-actions">
          <!-- VIEW -->
          <button
            type="button"
            class="icon-btn view"
            title="Visualizza file"
            @click="viewFile(item)"
          >
            <EyeIcon class="icon" />
          </button>

          <!-- DELETE -->
          <button
            type="button"
            class="icon-btn delete"
            title="Elimina file"
            @click="deleteFile(item)"
          >
            <TrashIcon class="icon" />
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { injectAzienda } from '../../composables/useAzienda';
import { ArrowUpTrayIcon, EyeIcon, TrashIcon } from '@heroicons/vue/24/outline';

const api = useApi();
const selectedAzienda = injectAzienda();

const files = ref([]);
const loading = ref(false);
const search = ref('');
const uploadError = ref('');
const uploading = ref(false);
const isDragging = ref(false);
const fileInput = ref(null);

async function loadFiles() {
  loading.value = true;
  uploadError.value = '';
  try {
    const baseParams = {
      fields: [
        'id',
        'file.id',
        'file.filename_download',
        'file.type',
        'delete',
        'azienda',
      ],
      sort: ['-date_created'],
    };

    // Escludi record con delete: true e filtra per azienda se selezionata
    baseParams.filter = { delete: { _neq: true } };
    if (selectedAzienda.selectedAzienda?.value) {
      baseParams.filter.azienda = { _eq: selectedAzienda.selectedAzienda.value };
    }

    let data = [];
    try {
      const res = await api.get('/items/file', { params: baseParams });
      data = res.data.data || [];
    } catch (e) {
      const fallbackParams = {
        ...baseParams,
        fields: ['id', 'file.id', 'file.filename_download', 'file.type', 'azienda'],
      };
      const res = await api.get('/items/file', { params: fallbackParams });
      data = res.data.data || [];
    }
    files.value = data;
  } catch (e) {
    files.value = [];
    uploadError.value = 'Errore caricamento file';
  } finally {
    loading.value = false;
  }
}

const filteredFiles = computed(() => {
  if (!search.value) return files.value;
  return files.value.filter(item =>
    item.file?.filename_download
      ?.toLowerCase()
      .includes(search.value.toLowerCase())
  );
});

function viewFile(item) {
  if (!item.file?.id) return;
  window.open(`/assets/${item.file.id}`, '_blank');
}

function triggerFilePicker() {
  if (uploading.value) return;
  fileInput.value?.click();
}

function onFileChange(event) {
  const file = event.target.files?.[0];
  if (file) handleNewFile(file);
  event.target.value = '';
}

function onDragOver() {
  if (uploading.value) return;
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(event) {
  if (uploading.value) return;
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) handleNewFile(file);
}

async function handleNewFile(file) {
  if (!file || uploading.value) return;
  uploadError.value = '';
  uploading.value = true;

  try {
    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await api.post('/files', formData);
    const uploaded = uploadRes?.data?.data;
    const fileId = uploaded?.id;
    const fileName = uploaded?.filename_download || file.name || 'File';

    if (!fileId) {
      uploadError.value = 'Errore durante il caricamento';
      return;
    }

    // Prepara il payload con azienda, id_user e id_agente del cliente selezionato
    const basePayload = {
      file: fileId,
      nome: fileName,
    };
    if (selectedAzienda.selectedAzienda?.value) {
      basePayload.azienda = selectedAzienda.selectedAzienda.value;
      try {
        const clientiRes = await api.get('/items/clienti', {
          params: {
            filter: { azienda: { _eq: selectedAzienda.selectedAzienda.value } },
            fields: ['id_user', 'agent_elevenlabs'],
            limit: 1,
          },
        });
        const cliente = clientiRes?.data?.data?.[0];
        if (cliente?.id_user) {
          basePayload.id_user = cliente.id_user;
        }
        if (cliente?.agent_elevenlabs) {
          basePayload.id_agente = cliente.agent_elevenlabs;
        }
      } catch (e) {
        // Continua senza id_user/id_agente se il cliente non è trovato
      }
    }

    let created = null;
    try {
      const createdRes = await api.post('/items/file', basePayload);
      created = createdRes?.data?.data;
    } catch (e) {
      const fallbackPayload = { file: fileId };
      if (selectedAzienda.selectedAzienda?.value) {
        fallbackPayload.azienda = selectedAzienda.selectedAzienda.value;
        if (basePayload.id_user) {
          fallbackPayload.id_user = basePayload.id_user;
        }
        if (basePayload.id_agente) {
          fallbackPayload.id_agente = basePayload.id_agente;
        }
      }
      const createdRes = await api.post('/items/file', fallbackPayload);
      created = createdRes?.data?.data;
    }
    if (created?.id) {
      files.value = [created, ...files.value.filter((item) => item.id !== created.id)];
    }
    await loadFiles();
  } catch (e) {
    uploadError.value = 'Errore durante il caricamento';
  } finally {
    uploading.value = false;
    isDragging.value = false;
  }
}

async function deleteFile(item) {
  const name = item.file?.filename_download || 'questo file';
  const ok = confirm(`Eliminare "${name}"?`);
  if (!ok) return;
  const id = item.id;
  uploadError.value = '';
  try {
    // 1. Imposta delete: true (rimuove dalla lista al prossimo reload)
    await api.patch(`/items/file/${id}`, { delete: true });

    // 2. Rimuovi subito dall'interfaccia
    files.value = files.value.filter((file) => file.id !== id);

    // 3. Dopo 10 secondi elimina definitivamente dalla collection
    setTimeout(async () => {
      try {
        await api.delete(`/items/file/${id}`);
      } catch (e) {
        console.error('Errore durante eliminazione definitiva file:', e);
      }
    }, 10000);
  } catch (e) {
    uploadError.value = 'Errore durante eliminazione file';
  }
}

onMounted(loadFiles);

// Ricarica quando cambia l'azienda
watch(() => selectedAzienda.selectedAzienda?.value, () => {
  loadFiles();
}, { immediate: false });
</script>

<style scoped>
.file-tab {
  display: grid;
  gap: 20px;
}

.file-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
}

.file-search {
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

.file-search:focus {
  outline: none;
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
}

.file-upload {
  width: 100%;
  min-height: 140px;
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.08) 0%, rgba(124, 141, 232, 0.05) 100%);
  border: 2px dashed #5e72e4;
  border-radius: 12px;
  color: #5e72e4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  padding: 32px 20px;
  margin-bottom: 24px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(94, 114, 228, 0.1);
}

.file-upload:hover {
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.12) 0%, rgba(124, 141, 232, 0.08) 100%);
  border-color: #4c63d2;
  box-shadow: 0 4px 8px rgba(94, 114, 228, 0.15);
  transform: translateY(-1px);
}

.file-upload.is-dragging {
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.15) 0%, rgba(124, 141, 232, 0.12) 100%);
  border-color: #4c63d2;
  box-shadow: 0 6px 12px rgba(94, 114, 228, 0.2);
}

.file-upload.is-uploading {
  cursor: default;
  opacity: 0.85;
}

.file-input {
  display: none;
}

.file-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.file-upload-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  width: 24px;
  height: 24px;
  color: #5e72e4;
}

.file-upload-title {
  font-size: 16px;
  font-weight: 600;
  color: #5e72e4;
  letter-spacing: -0.01em;
}

.file-upload-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #7c8de8;
  font-weight: 500;
  opacity: 0.9;
}

.file-upload-status {
  position: absolute;
  right: 16px;
  bottom: 16px;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(94, 114, 228, 0.15);
  color: #5e72e4;
  font-weight: 500;
}

.upload-error {
  color: #ef4444;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin: -6px 0 16px;
}

.file-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--foreground-subdued, #6b7280);
  font-size: 14px;
}

.no-results {
  padding: 40px 20px;
  text-align: center;
  color: var(--foreground-subdued, #6b7280);
  font-size: 14px;
}

.file-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-card {
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

.file-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  border-color: var(--border-color, #d1d5db);
}

.file-content {
  flex: 1;
  padding-right: 16px;
  min-width: 0;
}

.file-content h4 {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.01em;
  line-height: 1.4;
}

.file-content .preview {
  margin: 0;
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}

.file-actions {
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

.icon-btn.view {
  color: #5e72e4;
}

.icon-btn.view:hover {
  background: rgba(94, 114, 228, 0.1);
  border-color: #5e72e4;
}

.icon-btn.delete {
  color: #ef4444;
}

.icon-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}
</style>
