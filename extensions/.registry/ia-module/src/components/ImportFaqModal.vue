<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Importa le tue FAQ da CSV</h2>
        <button class="close" type="button" @click="emit('close')">✕</button>
      </div>

      <div class="csv-requirements">
        <div class="requirements-header">
          <h3>Requisiti per importare con file CSV</h3>
          <a href="#" @click.prevent="downloadExampleCSV">Scarica esempio</a>
        </div>

        <ul>
          <li>prima colonna: domanda</li>
          <li>seconda colonna: risposta</li>
          <li>usa il punto e virgola (;) come separatore (consigliato)</li>
          <li>massimo 100 FAQ per importazione</li>
          <li>lunghezza massima domanda: 300 caratteri</li>
          <li>lunghezza massima risposta: 1200 caratteri</li>
        </ul>
      </div>

      <h4>Seleziona il tuo file CSV</h4>
      <input type="file" accept=".csv" @change="onFileSelected" />

      <div v-if="error" class="errors">⚠ {{ error }}</div>
      <div v-if="progress > 0" class="progress">
        <progress :value="progress" max="100" />
        <span>{{ progress }}%</span>
      </div>

      <div class="actions">
        <button type="button" class="btn-secondary" @click="emit('close')">Annulla</button>
        <button
          type="button"
          class="btn-primary"
          :disabled="!selectedFile || parsing || importing"
          @click="importAll"
        >
          {{ importing ? 'Importazione…' : 'Importa FAQ' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { injectAzienda } from '../composables/useAzienda';
import Papa from 'papaparse';
import { importCsvToFaq } from '../utils/importCsvToFaq';

const emit = defineEmits(['close', 'imported']);
const api = useApi();
const selectedAzienda = injectAzienda();

const selectedFile = ref(null);
const error = ref('');
const progress = ref(0);

const parsing = ref(false);
const importing = ref(false);

function onFileSelected(event) {
  selectedFile.value = event?.target?.files?.[0] ?? null;
  error.value = '';
  progress.value = 0;
}

async function importAll() {
  if (!selectedFile.value) return;
  importing.value = true;
  try {
    progress.value = 10;
    parsing.value = true;
    await importCsvToFaq(api, selectedFile.value, selectedAzienda);

    progress.value = 100;
    emit('imported');
    emit('close');
  } catch (e) {
    error.value = e?.message || 'Errore durante import CSV.';
  } finally {
    parsing.value = false;
    importing.value = false;
  }
}

function downloadExampleCSV() {
  const csv = 'domanda;risposta\nEsempio domanda;Esempio risposta';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'faq_example.csv';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
  padding: 24px;
}

.modal {
  width: 720px;
  max-width: 95vw;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #eee;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.close {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e5e5e5;
  background: #fff;
  cursor: pointer;
}

.csv-requirements {
  background: #f3f0ff;
  color: #6c5cff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.requirements-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.csv-requirements a {
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  color: inherit;
}

input[type='file'] {
  margin-top: 8px;
}

.errors {
  color: #e54848;
  margin-top: 12px;
}

.progress {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress progress {
  width: 100%;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn-primary {
  background: #6c5ce7;
  color: white;
  border-radius: 10px;
  border: 1px solid #6c5ce7;
  padding: 10px 14px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border-radius: 10px;
  border: 1px solid #ddd;
  padding: 10px 14px;
  cursor: pointer;
}
</style>

