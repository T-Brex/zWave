<template>
  <div class="details-sidebar">
    <!-- Sezione Selezione Azienda in alto a destra -->
    <div class="azienda-selection-top">
      <v-button
        v-tooltip="selectedAzienda ? 'Cambia azienda' : 'Seleziona azienda'"
        :secondary="!!selectedAzienda"
        :type="selectedAzienda ? 'secondary' : 'primary'"
        @click="$emit('open-drawer')"
        class="azienda-select-button"
      >
        <v-icon name="business" left />
        <span class="azienda-button-text">
          {{ selectedAzienda || 'Seleziona azienda' }}
        </span>
        <v-icon name="arrow_drop_down" right />
      </v-button>
    </div>
    
    <div class="details-header">
      <h2>Dettagli Contatto</h2>
    </div>
    <div v-if="activeConversation" class="customer-details">
      <div class="detail-item">
        <label>Nome:</label>
        <span>{{ getField(activeConversation, 'nome') || 'N/A' }}</span>
      </div>
      <div class="detail-item">
        <label>Telefono:</label>
        <span>{{ getField(activeConversation, 'telefono') || 'N/A' }}</span>
      </div>
      <div v-if="emailValue" class="detail-item">
        <label>Email:</label>
        <span>{{ emailValue }}</span>
      </div>
      <div class="detail-item">
        <label>Interesse:</label>
        <span>{{ getField(activeConversation, 'interesse') || 'N/A' }}</span>
      </div>
      <div class="detail-item">
        <label>Prenotazione Effettuata:</label>
        <span
          v-if="normalizeYesNo(getField(activeConversation, 'prenotazione_effettuata')) === 'SI'"
          class="status-badge booked"
        >
          Prenotato
        </span>
        <span
          v-else-if="normalizeYesNo(getField(activeConversation, 'prenotazione_effettuata')) === 'NO'"
          class="status-badge not-booked"
        >
          Non ha prenotato
        </span>
        <span v-else class="status-badge unknown">N/D</span>
      </div>
      <div v-if="getField(activeConversation, 'data_prenotazione')" class="detail-item">
        <label>Data Prenotazione:</label>
        <span>{{ formatDate(getField(activeConversation, 'data_prenotazione')) }}</span>
      </div>
      <div v-if="getField(activeConversation, 'durata_minuti')" class="detail-item">
        <label>Durata:</label>
        <span>{{ formatDuration(getField(activeConversation, 'durata_minuti')) }}</span>
      </div>
      <div class="detail-item">
        <label>Audio:</label>
        <div v-if="audioSrc" class="audio-controls-wrapper">
          <audio
            ref="audioPlayer"
            class="audio-player"
            :src="audioSrc"
            controls
            preload="metadata"
            @loadedmetadata="onAudioLoaded"
          />
          <div class="playback-speed-controls">
            <span class="speed-label">Velocità:</span>
            <div class="speed-buttons">
              <button
                v-for="speed in playbackSpeeds"
                :key="speed"
                :class="['speed-btn', { active: playbackSpeed === speed }]"
                @click="setPlaybackSpeed(speed)"
              >
                {{ speed }}x
              </button>
            </div>
          </div>
        </div>
        <span v-else class="no-audio">Nessun file audio disponibile</span>
      </div>
      <div class="detail-item">
        <label>Data chiamata:</label>
        <span>{{ formatDate(activeConversation.date_created) }}</span>
      </div>
      <div v-if="isAdmin" class="detail-item">
        <label>Tag:</label>
        <div class="tags-section">
          <div v-if="assignedTags.length" class="tags-list">
            <div
              v-for="tag in assignedTags"
              :key="tag.id || tag.nome"
              class="tag-chip"
              :style="{
                backgroundColor: tag.colore || defaultTagColor,
                color: getTagTextColor(tag.colore || defaultTagColor)
              }"
            >
              <span class="tag-text">{{ tag.nome }}</span>
              <button
                class="tag-remove-btn"
                :disabled="tagsSaving"
                @click="removeTag(tag)"
                title="Rimuovi tag"
                aria-label="Rimuovi tag"
              >
                <v-icon name="close" small />
              </button>
            </div>
          </div>
          <div v-else class="no-tags">Nessun tag</div>

          <div class="tag-input-row">
            <div class="tag-input-wrapper">
              <v-input
                v-model="tagSearch"
                placeholder="Cerca o crea un tag..."
                class="tag-input"
                @focus="onTagFocus"
                @blur="onTagBlur"
                @keydown="tagInputHandlers.handleKeydown"
                @keyup="tagInputHandlers.handleKeyup"
                @input="tagInputHandlers.handleInput"
              />
              <button
                v-if="isTagInputFocused"
                class="tag-add-button"
                :disabled="!canCreateTag || tagsSaving"
                @click="createAndAddTag"
                aria-label="Crea tag"
                title="Crea tag"
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <v-info
            v-if="tagAlreadyExists"
            type="warning"
            icon="info"
            title="Questa etichetta esiste già"
            class="tags-warning"
          />

          <div v-if="showSuggestions && visibleTags.length" class="tag-suggestions">
            <button
              v-for="tag in visibleTags"
              :key="tag.id"
              class="tag-suggestion"
              :disabled="isTagAssigned(tag.id) || tagsSaving"
              :style="{
                backgroundColor: tag.colore || defaultTagColor,
                color: getTagTextColor(tag.colore || defaultTagColor)
              }"
              @click="addExistingTag(tag)"
            >
              <span class="tag-suggestion-name">{{ tag.nome }}</span>
              <span v-if="isTagAssigned(tag.id)" class="tag-suggestion-meta">Già assegnato</span>
            </button>
          </div>

          <div v-else-if="showSuggestions && !canCreateTag && !tagAlreadyExists" class="tag-suggestions empty">
            Nessun altro tag disponibile
          </div>

          <div v-if="loadingTags" class="tags-loading">
            <v-progress-circular indeterminate small />
            <span>Caricamento tag...</span>
          </div>

          <v-info
            v-if="tagsError"
            type="danger"
            icon="error"
            :title="tagsError"
            class="tags-error"
          />
        </div>
      </div>
      <div class="detail-item">
        <label>ID:</label>
        <span class="conversation-id">{{ activeConversation.id }}</span>
      </div>
    </div>
    <v-info
      v-else
      icon="info"
      title="Nessun contatto selezionato"
    >
      Seleziona un contatto per vedere i dettagli
    </v-info>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { createInputHandler } from '../utils/inputHandlers';
import { getField as getFieldUtil, formatDate, formatDuration, normalizeYesNo } from '../utils/conversationUtils';

const props = defineProps({
  activeConversation: {
    type: Object,
    default: null
  },
  selectedAzienda: {
    type: String,
    default: null
  },
  fieldNames: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['open-drawer']);

const api = useApi();

const audioPlayer = ref(null);
const playbackSpeed = ref(1);
const playbackSpeeds = [1, 1.5, 2];

const tagSearch = ref('');
const isTagInputFocused = ref(false);
const showSuggestions = ref(false);
const availableTags = ref([]);
const loadingTags = ref(false);
const tagsSaving = ref(false);
const tagsError = ref(null);
const currentUserId = ref(null);
const currentUserIsAdmin = ref(false);
const defaultTagColor = '#e5e7eb';

const audioSrc = computed(() => {
  if (!props.activeConversation) return '';
  const audioField = props.fieldNames?.audio_file || 'audio_file';
  let audio = props.activeConversation[audioField];
  if (!audio) return '';
  if (Array.isArray(audio) && audio.length > 0) {
    audio = audio[0];
  }
  const id = typeof audio === 'string' ? audio : audio?.id || audio?.file || (typeof audio?.file === 'object' ? audio.file.id : '');
  return id ? `/assets/${id}` : '';
});

const emailValue = computed(() => {
  if (!props.activeConversation) return '';
  const mapped = getField(props.activeConversation, 'email');
  const raw = mapped ?? props.activeConversation?.email ?? '';
  const value = String(raw ?? '').trim();
  return value.includes('@') ? value : '';
});

const tagsField = computed(() => props.fieldNames?.tags || 'tags');

const assignedTags = computed(() => {
  if (!props.activeConversation) return [];
  const raw = props.activeConversation[tagsField.value];
  if (!Array.isArray(raw)) return [];
  return raw
    .map(tag => normalizeTagObject(tag))
    .filter(tag => tag && tag.nome);
});

const filteredTags = computed(() => {
  const query = tagSearch.value.trim().toLowerCase();
  if (!query) return [];
  return availableTags.value.filter(tag => tag.nome.toLowerCase().includes(query));
});

const globalTags = computed(() => availableTags.value.filter(tag => tag.is_global));

const visibleTags = computed(() => {
  if (!showSuggestions.value) return [];
  if (tagSearch.value.trim().length === 0) {
    return globalTags.value;
  }
  return filteredTags.value;
});

const tagAlreadyExists = computed(() => {
  const value = tagSearch.value.trim().toLowerCase();
  if (!value) return false;
  return availableTags.value.some(tag => tag.nome.toLowerCase() === value);
});

const canCreateTag = computed(() => {
  const value = tagSearch.value.trim();
  if (!value || !currentUserId.value) return false;
  return !tagAlreadyExists.value;
});

const isAdmin = computed(() => currentUserIsAdmin.value);

const tagInputHandlers = createInputHandler(tagSearch, () => {
  const match = findTagByName(tagSearch.value);
  if (match) {
    addExistingTag(match);
  } else {
    createAndAddTag();
  }
});

watch(audioSrc, () => {
  if (audioPlayer.value) {
    audioPlayer.value.playbackRate = playbackSpeed.value;
  }
});

watch(
  () => props.activeConversation?.id,
  () => {
    tagSearch.value = '';
    tagsError.value = null;
  }
);

function getField(conversation, fieldName) {
  return getFieldUtil(conversation, fieldName, props.fieldNames);
}

function setPlaybackSpeed(speed) {
  playbackSpeed.value = speed;
  if (audioPlayer.value) {
    audioPlayer.value.playbackRate = speed;
  }
}

function onAudioLoaded() {
  if (audioPlayer.value) {
    audioPlayer.value.playbackRate = playbackSpeed.value;
  }
}

async function loadCurrentUser() {
  try {
    const response = await api.get('/users/me', { params: { fields: 'id,role.id,role.name,role.admin_access' } });
    const data = response.data?.data || response.data;
    currentUserId.value = data?.id || null;
    currentUserIsAdmin.value = !!data?.role?.admin_access;
  } catch (err) {
    console.error('Errore nel caricamento utente:', err);
    currentUserIsAdmin.value = false;
  }
}

async function loadTags() {
  loadingTags.value = true;
  tagsError.value = null;
  try {
    const baseParams = {
      fields: ['id', 'nome', 'colore', 'is_global', 'proprietario'].join(','),
      sort: 'nome',
      limit: -1
    };

    const filter = currentUserId.value
      ? {
          _or: [
            { is_global: { _eq: true } },
            { proprietario: { _eq: currentUserId.value } }
          ]
        }
      : { is_global: { _eq: true } };

    const response = await api.get('/items/tags', {
      params: { ...baseParams, filter }
    });
    availableTags.value = response.data?.data || response.data || [];
  } catch (err) {
    console.error('Errore nel caricamento tag:', err);
    tagsError.value = 'Errore nel caricamento tag. Verifica i permessi.';
  } finally {
    loadingTags.value = false;
  }
}

function normalizeTagObject(tag) {
  if (!tag) return null;
  if (typeof tag === 'object') {
    const source = tag.tags_id || tag;
    return {
      id: source.id ?? tag.id ?? null,
      nome: String(source.nome ?? '').trim(),
      colore: source.colore ?? defaultTagColor,
      is_global: !!source.is_global
    };
  }
  const match = availableTags.value.find(t => String(t.id) === String(tag));
  return match
    ? {
        id: match.id ?? null,
        nome: String(match.nome ?? '').trim(),
        colore: match.colore ?? defaultTagColor,
        is_global: !!match.is_global
      }
    : null;
}

function findTagByName(name) {
  const value = String(name ?? '').trim().toLowerCase();
  if (!value) return null;
  return availableTags.value.find(tag => tag.nome.toLowerCase() === value) || null;
}

function isTagAssigned(tagId) {
  return assignedTags.value.some(tag => String(tag.id) === String(tagId));
}

function generateRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i += 1) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getTagTextColor(hex) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return '#111827';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#111827' : '#ffffff';
}

function onTagFocus() {
  isTagInputFocused.value = true;
  showSuggestions.value = true;
}

function onTagBlur() {
  isTagInputFocused.value = false;
  window.setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
}

async function saveTags(nextTags) {
  if (!props.activeConversation?.id) return;
  tagsSaving.value = true;
  tagsError.value = null;

  try {
    const payloadValue = nextTags.map(tag => tag.id).filter(Boolean);
    await api.patch(`/items/Chiamate/${props.activeConversation.id}`, {
      [tagsField.value]: payloadValue
    });

    props.activeConversation[tagsField.value] = nextTags;
  } catch (err) {
    console.error('Errore nel salvataggio dei tag:', err);
    const status = err.response?.status;
    if (status === 403) {
      tagsError.value = 'Accesso negato. Non hai i permessi per modificare i record.';
    } else if (status === 404) {
      tagsError.value = 'Record non trovato. Potrebbe essere stato eliminato.';
    } else {
      tagsError.value = `Errore nel salvataggio dei tag: ${err.message || 'Errore sconosciuto'}`;
    }
  } finally {
    tagsSaving.value = false;
  }
}

function addExistingTag(tag) {
  if (tagsSaving.value || !tag) return;
  if (isTagAssigned(tag.id)) {
    tagSearch.value = '';
    return;
  }
  const nextTags = [...assignedTags.value, normalizeTagObject(tag)].filter(Boolean);
  tagSearch.value = '';
  saveTags(nextTags);
}

async function createAndAddTag() {
  if (tagsSaving.value || !canCreateTag.value) return;
  const name = String(tagSearch.value || '').trim();
  if (!name) return;

  tagsSaving.value = true;
  tagsError.value = null;

  try {
    const response = await api.post('/items/tags', {
      nome: name,
      colore: generateRandomColor(),
      is_global: false,
      proprietario: currentUserId.value
    });

    const created = response.data?.data || response.data;
    if (created) {
      availableTags.value = [...availableTags.value, created].sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''), 'it')
      );
      addExistingTag(created);
    }
  } catch (err) {
    console.error('Errore nella creazione del tag:', err);
    const status = err.response?.status;
    if (status === 403) {
      tagsError.value = 'Accesso negato. Non hai i permessi per creare tag.';
    } else if (status === 400) {
      tagsError.value = 'Errore nella creazione del tag. Verifica i dati.';
    } else {
      tagsError.value = `Errore nella creazione del tag: ${err.message || 'Errore sconosciuto'}`;
    }
  } finally {
    tagsSaving.value = false;
  }
}

function removeTag(tag) {
  if (tagsSaving.value || !tag) return;
  const nextTags = assignedTags.value.filter(item => String(item.id) !== String(tag.id));
  saveTags(nextTags);
}

onMounted(async () => {
  await loadCurrentUser();
  if (currentUserIsAdmin.value) {
    await loadTags();
  }
});
</script>

<style scoped>
.details-sidebar {
  width: 320px;
  background: var(--background);
  border-left: 1px solid var(--border-color-subdued, #e5e7eb);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -1px 0 0 rgba(0, 0, 0, 0.05);
}

.azienda-selection-top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 18px 16px;
  border-bottom: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background);
  box-sizing: border-box;
  overflow: visible;
}

.azienda-select-button {
  width: 100%;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.azienda-select-button :deep(.v-button) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: visible;
  line-height: 1.5;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.azienda-select-button :deep(.v-button:hover) {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
  border-color: var(--border-color, #d1d5db);
}

.azienda-select-button :deep(.v-button:active) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.azienda-select-button :deep(.v-icon) {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  vertical-align: middle;
  transition: all 0.2s ease;
}

.azienda-select-button :deep(.v-icon[name="business"]) {
  color: inherit;
  opacity: 0.85;
  margin: 0;
  padding: 0;
}

.azienda-select-button :deep(.v-icon[name="arrow_drop_down"]) {
  color: inherit;
  opacity: 0.65;
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.azienda-select-button :deep(.v-button:hover .v-icon[name="arrow_drop_down"]) {
  opacity: 0.85;
}

.azienda-button-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  letter-spacing: -0.01em;
  font-size: 13px;
  line-height: 1.4;
}

.details-header {
  padding: 22px 24px;
  border-bottom: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background);
}

.details-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--foreground, #111827);
  letter-spacing: -0.4px;
}

.customer-details {
  padding: 24px;
  overflow-y: auto;
}

.detail-item {
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-color-subdued, #f3f4f6);
}

.detail-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.detail-item label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.8px;
}

.detail-item span {
  display: block;
  font-size: 14px;
  color: var(--foreground, #1f2937);
  word-break: break-word;
  line-height: 1.6;
  font-weight: 500;
}

.tags-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--background-subdued, #f9fafb);
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.tag-text {
  line-height: 1.2;
}

.tag-remove-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
}

.tag-remove-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.tag-remove-btn:hover:not(:disabled) {
  opacity: 1;
}

.no-tags {
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
  font-style: italic;
}

.tag-input-row {
  display: flex;
  align-items: center;
}

.tag-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.tag-input {
  width: 100%;
}

.tag-input :deep(input) {
  border-radius: 999px;
  padding-right: 32px;
  min-height: 32px;
  height: 32px;
  font-size: 12px;
}

.tag-add-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: var(--foreground-subdued, #6b7280);
  color: #ffffff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.tag-add-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tag-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 10px;
  background: var(--background-subdued, #f9fafb);
}

.tag-suggestions.empty {
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
  font-style: italic;
}

.tag-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.tag-suggestion:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.tag-suggestion:not(:disabled):hover {
  border-color: rgba(0, 0, 0, 0.08);
}

.tag-suggestion-name {
  font-size: 12px;
  font-weight: 600;
}

.tag-suggestion-meta {
  margin-left: auto;
  font-size: 11px;
  color: var(--foreground-subdued, #6b7280);
}

.tags-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
}

.tags-warning {
  margin-top: 4px;
}

.tags-error {
  margin-top: 4px;
}



.status-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-badge.booked {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.status-badge.not-booked {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.status-badge.unknown {
  background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
  color: #374151;
}

.conversation-id {
  font-family: 'Monaco', 'Menlo', 'Courier New', 'Consolas', monospace;
  font-size: 11px;
  color: var(--foreground-subdued, #6b7280);
  background: var(--background-subdued, #f9fafb);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
  letter-spacing: 0.3px;
}

.audio-controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audio-player {
  width: 100%;
  margin-top: 4px;
  border-radius: 8px;
  height: 32px;
}

.playback-speed-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--background-subdued, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
}

.speed-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.speed-buttons {
  display: flex;
  gap: 6px;
}

.speed-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  color: var(--foreground, #1f2937);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
}

.speed-btn:hover {
  border-color: var(--primary, #5e72e4);
  background: var(--background-subdued, #f9fafb);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.speed-btn.active {
  background: linear-gradient(135deg, #5e72e4 0%, #7c8de8 100%);
  border-color: #5e72e4;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(94, 114, 228, 0.3);
}

.no-audio {
  color: var(--foreground-subdued, #6b7280);
  font-size: 13px;
  font-style: italic;
}

.customer-details::-webkit-scrollbar {
  width: 8px;
}

.customer-details::-webkit-scrollbar-track {
  background: transparent;
}

.customer-details::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.customer-details::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
  background-clip: padding-box;
}
</style>
