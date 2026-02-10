<template>
  <div class="prompt-view">
    <div class="prompt-layout">
      <div class="prompt-main">
        <h3 class="prompt-title">Prompt</h3>
        <textarea
          v-model="promptDisplay"
          class="prompt-textarea"
          :readonly="!promptEditing"
          placeholder="Scrivi qui il prompt del chatbot..."
          @focus="startPromptEdit"
        />

        <div class="prompt-actions">
          <button
            class="btn-ghost"
            type="button"
            :disabled="!promptEditing"
            @click="cancelPromptEdit"
          >
            Annulla
          </button>
          <button
            class="btn-primary"
            type="button"
            :disabled="!promptEditing"
            @click="savePrompt"
          >
            Salva
          </button>
        </div>

        <h3 class="prompt-title">Primo Messaggio</h3>
        <textarea
          v-model="firstMessageDisplay"
          class="prompt-textarea prompt-textarea--small"
          :readonly="!firstMessageEditing"
          rows="2"
          placeholder="Scrivi il primo messaggio..."
          @focus="startFirstMessageEdit"
        />

        <div class="prompt-actions">
          <button
            class="btn-ghost"
            type="button"
            :disabled="!firstMessageEditing"
            @click="cancelFirstMessageEdit"
          >
            Annulla
          </button>
          <button
            class="btn-primary"
            type="button"
            :disabled="!firstMessageEditing"
            @click="saveFirstMessage"
          >
            Salva
          </button>
        </div>

        <p v-if="promptError" class="prompt-error">{{ promptError }}</p>
      </div>

      <aside class="prompt-sidebar">
        <div class="voice-panel">
          <div class="voice-panel-header">
            <h3 class="voice-title">Voce Agente</h3>
          </div>

          <div class="voice-preview">
            <div class="voice-preview-avatar">
              {{ (selectedVoice?.nome || 'V').slice(0, 1).toUpperCase() }}
            </div>
            <div class="voice-preview-content">
              <div class="voice-preview-name">
                {{ selectedVoice?.nome || 'Seleziona una voce' }}
              </div>
              <div v-if="selectedVoiceId && selectedVoiceId === defaultVoiceId" class="voice-badge">
                Predefinita
              </div>
            </div>
          </div>

          <div class="voice-divider" aria-hidden="true"></div>

          <div class="voice-field">
            <label class="voice-label" for="voice-select">Seleziona voce</label>
            <select
              id="voice-select"
              v-model="selectedVoiceId"
              class="voice-select"
              :disabled="voiceLoading"
              @change="handleVoiceSelection"
            >
              <option value="">Seleziona una voce</option>
              <option v-for="voice in voices" :key="voice.id" :value="voice.id">
                {{ voice.nome || 'Voce senza nome' }}
              </option>
            </select>
          </div>

          <p v-if="voiceLoading" class="voice-hint">Caricamento voci...</p>
          <p v-else-if="!voices.length" class="voice-hint">Nessuna voce disponibile.</p>

          <div v-if="selectedVoice" class="voice-details">
            <p class="voice-description">
              {{ selectedVoice.descrizione || 'Nessuna descrizione disponibile.' }}
            </p>
            <audio class="voice-audio" controls :src="selectedVoiceAudioUrl" />
            <p v-if="!selectedVoiceAudioUrl" class="voice-hint">
              Nessun audio disponibile per questa voce.
            </p>
          </div>

          <p v-if="voiceError" class="voice-error">{{ voiceError }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { usePrompt } from '../composables/usePrompt';
import { injectAzienda } from '../composables/useAzienda';
import { useApi } from '@directus/extensions-sdk';
import { computed, onMounted, ref, watch } from 'vue';

const selectedAzienda = injectAzienda();
const api = useApi();

const {
  promptDisplay,
  firstMessageDisplay,
  promptEditing,
  firstMessageEditing,
  promptError,
  loadPrompt,
  startPromptEdit,
  startFirstMessageEdit,
  cancelPromptEdit,
  cancelFirstMessageEdit,
  savePrompt,
  saveFirstMessage,
} = usePrompt(selectedAzienda);

const voices = ref([]);
const voiceLoading = ref(false);
const voiceError = ref('');
const selectedVoiceId = ref('');

const selectedVoice = computed(() =>
  voices.value.find((voice) => voice.id === selectedVoiceId.value)
);

const defaultVoiceId = computed(() => getDefaultVoiceId(voices.value));

const selectedVoiceAudioUrl = computed(() => {
  const fileId = selectedVoice.value?.voce_audio?.id;
  return fileId ? `/assets/${fileId}` : '';
});

function getDefaultVoiceId(items) {
  if (!items.length) return '';
  const anna = items.find(
    (voice) => (voice.nome || '').trim().toLowerCase() === 'anna'
  );
  return (anna || items[0]).id || '';
}

async function loadVoices() {
  voiceLoading.value = true;
  voiceError.value = '';
  try {
    const res = await api.get('/items/voci_agente', {
      params: {
        fields: [
          'id',
          'nome',
          'descrizione',
          'id_elevenlabs',
          'cliente',
          'voce_audio.id',
          'voce_audio.filename_download',
        ],
        limit: -1,
        sort: ['nome'],
      },
    });
    voices.value = res?.data?.data || [];
    const ids = new Set(voices.value.map((voice) => voice.id));
    if (!ids.has(selectedVoiceId.value)) {
      selectedVoiceId.value = getDefaultVoiceId(voices.value);
    }
  } catch (e) {
    voiceError.value = 'Errore caricamento voci agente';
    voices.value = [];
  } finally {
    voiceLoading.value = false;
  }
}

async function resolveClienteId() {
  const aziendaValue = selectedAzienda.selectedAzienda?.value;
  if (!aziendaValue) return null;
  try {
    const res = await api.get('/items/clienti', {
      params: {
        fields: ['id'],
        filter: {
          azienda: {
            _eq: aziendaValue,
          },
        },
        limit: 1,
      },
    });
    return res?.data?.data?.[0]?.id || null;
  } catch (e) {
    return null;
  }
}

async function handleVoiceSelection() {
  voiceError.value = '';
  const voiceId = selectedVoiceId.value;
  if (!voiceId) return;

  const clienteId = await resolveClienteId();
  if (!clienteId) {
    voiceError.value = 'Seleziona un cliente valido per associare la voce.';
    return;
  }

  const currentCliente =
    selectedVoice.value?.cliente?.id ?? selectedVoice.value?.cliente ?? null;
  if (currentCliente === clienteId) return;

  try {
    await api.patch(`/items/voci_agente/${voiceId}`, { cliente: clienteId });
    const index = voices.value.findIndex((voice) => voice.id === voiceId);
    if (index !== -1) {
      voices.value[index].cliente = clienteId;
    }
  } catch (e) {
    voiceError.value = 'Errore durante l’associazione del cliente alla voce.';
  }
}

onMounted(() => {
  loadPrompt();
  loadVoices();
});

// Ricarica il prompt quando cambia l'azienda
watch(() => selectedAzienda.selectedAzienda?.value, (newAzienda, oldAzienda) => {
  // Reset dei valori quando cambia azienda
  promptValue.value = '';
  firstMessageValue.value = '';
  promptDraft.value = '';
  firstMessageDraft.value = '';
  promptId.value = null;
  promptError.value = '';
  
  // Ricarica il prompt per la nuova azienda
  if (newAzienda) {
    loadPrompt();
  }
}, { immediate: false });

watch(() => selectedAzienda.selectedAzienda?.value, () => {
  selectedVoiceId.value = '';
  loadVoices();
});
</script>

<style scoped>
.prompt-view {
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.prompt-layout {
  display: flex;
  align-items: flex-start;
  gap: 32px;
}

.prompt-main {
  flex: 2;
  min-width: 0;
}

.prompt-sidebar {
  flex: 1;
  min-width: 260px;
}

.prompt-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.02em;
}

.prompt-title + .prompt-textarea {
  margin-bottom: 24px;
}

.prompt-textarea {
  width: 100%;
  min-height: 360px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--background, #ffffff);
  color: var(--foreground, #1a1a1a);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1), 0 2px 4px rgba(0, 0, 0, 0.08);
}

.prompt-textarea--small {
  min-height: auto;
}

.prompt-textarea:read-only {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  cursor: text;
}

.prompt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  margin-bottom: 40px;
}

.prompt-error {
  margin-top: 16px;
  color: #ef4444;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.btn-primary,
.btn-ghost {
  height: 44px;
  border-radius: 10px;
  padding: 0 20px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary {
  background: linear-gradient(135deg, #5e72e4 0%, #7c8de8 100%);
  color: #fff;
  border: 1px solid #5e72e4;
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

.btn-ghost {
  background: var(--background, #ffffff);
  color: var(--foreground, #1a1a1a);
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--background-subdued, #f9fafb);
  border-color: var(--border-color, #d1d5db);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.btn-ghost:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.voice-panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 360px;
}

.voice-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 34px;
}

.voice-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: var(--foreground-subdued, #6b7280);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.voice-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.voice-preview-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #d1fae5;
  color: #065f46;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-preview-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.voice-preview-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
}

.voice-badge {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
}

.voice-divider {
  height: 1px;
  width: 100%;
  background: var(--border-color-subdued, #e5e7eb);
  opacity: 0.7;
}

.voice-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  letter-spacing: 0.2px;
}

.voice-select {
  min-height: 52px;
  border-radius: 14px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  padding: 10px 40px 10px 14px;
  font: inherit;
  background: var(--background, #ffffff)
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")
    no-repeat right 14px center;
  color: var(--foreground, #1a1a1a);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  appearance: none;
}

.voice-select:focus {
  outline: none;
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
}

.voice-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.voice-description {
  font-size: 14px;
  line-height: 1.7;
  font-weight: 500;
  color: var(--foreground, #1a1a1a);
  background: #f8fafc;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
}

.voice-audio {
  width: 100%;
}

.voice-hint {
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
  margin: 0 0 8px;
}

.voice-error {
  margin-top: 12px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .prompt-layout {
    flex-direction: column;
  }

  .prompt-sidebar {
    width: 100%;
  }
}
</style>
