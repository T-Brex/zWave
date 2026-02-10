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
            :class="{ 'btn-success': promptSaved }"
            :disabled="!promptEditing"
            @click="handleSavePrompt"
          >
            {{ promptSaved ? 'Salvato' : 'Salva' }}
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
            :class="{ 'btn-success': firstMessageSaved }"
            :disabled="!firstMessageEditing"
            @click="handleSaveFirstMessage"
          >
            {{ firstMessageSaved ? 'Salvato' : 'Salva' }}
          </button>
        </div>

        <p v-if="promptError" class="prompt-error">{{ promptError }}</p>
      </div>

      <aside class="prompt-sidebar">
        <div class="voice-panel">
          <div class="voice-panel-header">
            <h3 class="voice-title">Voce</h3>
          </div>

          <button
            class="voice-compact"
            type="button"
            :disabled="voiceLoading"
            @click="openVoicePanel"
          >
            <div class="voice-compact-left">
              <div class="voice-preview-avatar" :style="getAvatarStyle(selectedVoice)">
                {{ (selectedVoice?.nome || 'V').slice(0, 1).toUpperCase() }}
              </div>
              <div class="voice-compact-text">
                <div class="voice-preview-name">
                  {{ selectedVoice?.nome || 'Seleziona una voce' }}
                </div>
                <div
                  v-if="selectedVoiceId && selectedVoiceId === defaultVoiceId"
                  class="voice-badge"
                >
                  Predefinita
                </div>
              </div>
            </div>
            <span class="voice-compact-icon">›</span>
          </button>

          <p v-if="voiceLoading" class="voice-hint">Caricamento voci...</p>
          <p v-else-if="!voices.length" class="voice-hint">Nessuna voce disponibile.</p>
          <p v-if="voiceError" class="voice-error">{{ voiceError }}</p>
        </div>

        <div class="language-panel">
          <div class="voice-panel-header language-panel-header">
            <h3 class="voice-title">Lingue</h3>
          </div>

          <div class="language-box">
            <button
              class="language-trigger"
              type="button"
              :disabled="languagesLoading"
              @click="openDefaultPanel"
            >
              <div class="language-trigger-text">
                <span class="language-trigger-label">Lingua default</span>
                <span class="language-trigger-value">{{ defaultLanguageLabel }}</span>
              </div>
              <span class="language-trigger-badge">Default</span>
              <span class="language-trigger-icon">›</span>
            </button>

            <button
              class="language-trigger"
              type="button"
              :disabled="languagesLoading"
              @click="openExtrasPanel"
            >
              <div class="language-trigger-text">
                <span class="language-trigger-label">Lingue aggiuntive</span>
                <span class="language-trigger-value">{{ extraLanguagesLabel }}</span>
              </div>
              <span class="language-trigger-icon">›</span>
            </button>

            <div class="detect-row">
              <div class="language-trigger-text">
                <span class="language-trigger-label">Detect language</span>
              </div>
              <div class="detect-actions">
                <button
                  class="detect-config-btn"
                  type="button"
                  :disabled="!detectLanguage"
                  @click="openDetectPanel"
                  aria-label="Configura language detection"
                >
                  <v-icon name="settings" class="detect-config-icon" />
                </button>
                <button
                  class="detect-toggle"
                  type="button"
                  role="switch"
                  :aria-checked="detectLanguage"
                  @click="toggleDetectLanguage"
                >
                  <span class="detect-toggle-thumb"></span>
                </button>
              </div>
            </div>
          </div>

          <p v-if="languagesLoading" class="voice-hint">Caricamento lingue...</p>
          <p v-else-if="!languages.length" class="voice-hint">Nessuna lingua disponibile.</p>

          <div class="language-save-row">
            <button
              class="voice-save voice-save--compact"
              type="button"
              :class="{ 'voice-save--success': languagesSaved }"
              :disabled="languagesSaving || !languagesDirty"
              @click="saveLanguageSelection"
            >
              {{ languagesSaved ? 'Salvato' : languagesSaving ? 'Salvataggio...' : 'Salva' }}
            </button>
          </div>

          <p v-if="languagesError" class="voice-error">{{ languagesError }}</p>
        </div>
      </aside>

      <div v-if="defaultPanelOpen" class="language-overlay">
        <div class="language-overlay-backdrop" @click="closeLanguagePanels"></div>
        <div class="language-panel-drawer">
          <div class="language-panel-header">
            <h4 class="language-panel-title">Lingua default</h4>
            <button class="language-panel-close" type="button" @click="closeLanguagePanels">
              ×
            </button>
          </div>
          <div class="language-panel-search">
            <input
              v-model="defaultSearch"
              class="language-panel-search-input"
              type="text"
              placeholder="Cerca lingua..."
            />
          </div>
          <div class="language-panel-list">
            <button
              v-for="lang in filteredDefaultLanguages"
              :key="lang.codice"
              class="language-panel-item"
              :class="{ 'language-panel-item--selected': lang.codice === defaultLanguageCode }"
              type="button"
              :disabled="isDefaultLanguageDisabled(lang)"
              @click="selectDefaultLanguage(lang)"
            >
              <div class="language-panel-item-text">
                <span>{{ lang.lingua || lang.codice }}</span>
                <span v-if="isDefaultLanguageDisabled(lang)" class="language-panel-note">
                  non disponibile
                </span>
              </div>
              <span
                v-if="lang.codice === defaultLanguageCode"
                class="language-panel-check"
                aria-hidden="true"
              >
                ✓
              </span>
            </button>
            <div v-if="!filteredDefaultLanguages.length" class="language-empty">
              Nessuna lingua.
            </div>
          </div>
        </div>
      </div>

      <div v-if="extrasPanelOpen" class="language-overlay">
        <div class="language-overlay-backdrop" @click="closeLanguagePanels"></div>
        <div class="language-panel-drawer">
          <div class="language-panel-header">
            <h4 class="language-panel-title">Lingue extra</h4>
            <button class="language-panel-close" type="button" @click="closeLanguagePanels">
              ×
            </button>
          </div>
          <div class="language-panel-search">
            <input
              v-model="extrasSearch"
              class="language-panel-search-input"
              type="text"
              placeholder="Cerca lingua..."
            />
          </div>
          <div class="language-panel-list">
            <button
              v-for="lang in filteredExtraLanguages"
              :key="lang.codice"
              class="language-panel-item language-panel-item--checkbox"
              type="button"
              :disabled="lang.codice === defaultLanguageCode"
              @click="toggleExtraLanguage(lang)"
            >
              <span>{{ lang.lingua || lang.codice }}</span>
              <span
                class="language-panel-checkbox"
                :class="{
                  'language-panel-checkbox--active': isExtraSelected(lang.codice),
                  'language-panel-checkbox--disabled': lang.codice === defaultLanguageCode,
                }"
                aria-hidden="true"
              ></span>
            </button>
            <div v-if="!filteredExtraLanguages.length" class="language-empty">
              Nessuna lingua.
            </div>
          </div>
        </div>
      </div>

      <div v-if="voicePanelOpen" class="voice-overlay">
        <div class="voice-overlay-backdrop" @click="closeVoicePanel"></div>
        <div class="voice-panel-drawer">
          <div class="voice-panel-top">
            <h4 class="voice-panel-title">Voce agente</h4>
            <div class="voice-panel-actions">
              <button
                class="voice-save voice-save--top"
                type="button"
                :class="{ 'voice-save--success': voiceSaved }"
                :disabled="voiceSaving || !selectedVoiceId"
                @click="saveVoiceSelection"
              >
                {{ voiceSaved ? 'Salvato' : voiceSaving ? 'Salvataggio...' : 'Salva' }}
              </button>
              <button class="voice-panel-close" type="button" @click="closeVoicePanel">×</button>
            </div>
          </div>
          <div class="voice-panel-search">
            <input
              v-model="voiceSearch"
              class="voice-panel-search-input"
              type="text"
              placeholder="Cerca voce..."
            />
          </div>
          <div class="voice-panel-body">
            <div class="voice-panel-list">
              <button
                v-for="voice in filteredVoices"
                :key="voice.id"
                class="voice-panel-item"
                :class="{ 'voice-panel-item--selected': voice.id === selectedVoiceId }"
                type="button"
                @click="selectVoiceFromPanel(voice)"
              >
                <div class="voice-panel-item-left">
                  <span class="voice-panel-item-name">{{ voice.nome || 'Voce senza nome' }}</span>
                  <span v-if="voice.id === defaultVoiceId" class="voice-panel-item-badge">
                    Predefinita
                  </span>
                </div>
                <span
                  v-if="voice.id === selectedVoiceId"
                  class="voice-panel-check"
                  aria-hidden="true"
                >
                  ✓
                </span>
              </button>
              <div v-if="!filteredVoices.length" class="voice-panel-empty">
                Nessuna voce.
              </div>
            </div>
            <div class="voice-panel-details">
              <div class="voice-panel-preview">
                <div class="voice-preview-avatar" :style="getAvatarStyle(selectedVoice)">
                  {{ (selectedVoice?.nome || 'V').slice(0, 1).toUpperCase() }}
                </div>
                <div class="voice-panel-preview-text">
                  <div class="voice-preview-name">
                    {{ selectedVoice?.nome || 'Seleziona una voce' }}
                  </div>
                  <div
                    v-if="selectedVoiceId && selectedVoiceId === defaultVoiceId"
                    class="voice-badge"
                  >
                    Predefinita
                  </div>
                </div>
              </div>

              <div v-if="selectedVoice" class="voice-details">
                <div class="voice-description" v-html="descriptionHtml"></div>
                <div v-if="selectedVoiceAudioUrl" class="voice-audio-player">
                  <button
                    class="voice-audio-btn"
                    type="button"
                    :aria-label="audioPlaying ? 'Pausa' : 'Play'"
                    @click="toggleAudio"
                  >
                    <svg
                      v-if="!audioPlaying"
                      class="voice-audio-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <polygon points="8,5 19,12 8,19" fill="currentColor" />
                    </svg>
                    <svg
                      v-else
                      class="voice-audio-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <rect x="7" y="5" width="4" height="14" fill="currentColor" />
                      <rect x="13" y="5" width="4" height="14" fill="currentColor" />
                    </svg>
                  </button>
                  <input
                    class="voice-audio-range"
                    type="range"
                    min="0"
                    :max="Math.max(audioDuration, 0)"
                    :value="audioCurrent"
                    step="0.1"
                    @input="onAudioSeek"
                  />
                  <span class="voice-audio-time">
                    {{ formatTime(audioCurrent) }} / {{ formatTime(audioDuration) }}
                  </span>
                  <audio
                    ref="audioRef"
                    :src="selectedVoiceAudioUrl"
                    @loadedmetadata="onAudioLoaded"
                    @timeupdate="onAudioTimeUpdate"
                    @ended="onAudioEnded"
                  />
                </div>
                <p v-if="!selectedVoiceAudioUrl" class="voice-hint">
                  Nessun audio disponibile per questa voce.
                </p>
              </div>
            </div>
          </div>
          <p v-if="voiceError" class="voice-error">{{ voiceError }}</p>
        </div>
      </div>

      <div v-if="detectPanelOpen" class="detect-overlay">
        <div class="detect-overlay-backdrop" @click="closeDetectPanel"></div>
        <div class="detect-panel-drawer">
          <div class="detect-panel-header">
            <h4 class="detect-panel-title">Detect language</h4>
            <button class="detect-panel-close" type="button" @click="closeDetectPanel">×</button>
          </div>
          <div class="detect-panel-content">
            <label class="detect-field-label">Descrizione</label>
            <textarea
              class="detect-field-textarea"
              rows="4"
              v-model="detectConfig.description"
            ></textarea>

            <label class="detect-field-checkbox">
              <input type="checkbox" v-model="detectConfig.disable_interruptions" />
              <span>Disabilita interruzioni</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePrompt } from '../composables/usePrompt';
import { injectAzienda } from '../composables/useAzienda';
import { useApi } from '@directus/extensions-sdk';
import { computed, onMounted, ref, watch } from 'vue';

const aziendaContext = injectAzienda();
const selectedAzienda = aziendaContext.selectedAzienda;
const api = useApi();
const currentUser = ref(null);

const {
  promptDisplay,
  promptValue,
  promptDraft,
  firstMessageDisplay,
  firstMessageValue,
  firstMessageDraft,
  promptEditing,
  firstMessageEditing,
  promptId,
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
const voiceSaving = ref(false);
const voiceSaved = ref(false);
const voicePanelOpen = ref(false);
const voiceSearch = ref('');
const languages = ref([]);
const languagesLoading = ref(false);
const languagesError = ref('');
const defaultLanguageCode = ref('');
const extraLanguageCodes = ref([]);
const languagesSaving = ref(false);
const languagesSaved = ref(false);
const savedDefaultLanguageCode = ref('');
const savedExtraLanguageCodes = ref([]);
const defaultPanelOpen = ref(false);
const extrasPanelOpen = ref(false);
const defaultSearch = ref('');
const extrasSearch = ref('');
const detectLanguage = ref(false);
const detectConfig = ref(null);
const detectPanelOpen = ref(false);
const detectSaving = ref(false);
const savedDetectLanguage = ref(false);
const savedDetectConfig = ref(null);
const audioRef = ref(null);
const audioDuration = ref(0);
const audioCurrent = ref(0);
const audioPlaying = ref(false);
const promptSaved = ref(false);
const firstMessageSaved = ref(false);
let promptSavedTimer;
let firstMessageSavedTimer;
let voiceSavedTimer;
let languagesSavedTimer;

const baseDetectConfig = {
  type: 'system',
  name: 'language_detection',
  description: '',
  params: {
    system_tool_type: 'language_detection',
    transfers: [],
    voicemail_message: '',
    use_out_of_band_dtmf: false,
  },
  disable_interruptions: false,
  tool_error_handling_mode: 'auto',
};

const defaultDetectConfig = {
  ...baseDetectConfig,
  description:
    "Cambia lingua solo se ti chiedono esplicitamente di parlare in un'altra lingua, e poi manitenila.",
};

const selectedVoice = computed(() =>
  voices.value.find((voice) => voice.id === selectedVoiceId.value)
);

const defaultVoiceId = computed(() => getDefaultVoiceId(voices.value));
const descriptionHtml = computed(() => {
  const raw = selectedVoice.value?.descrizione?.trim();
  if (!raw) {
    return '<span class="voice-description-empty">Nessuna descrizione disponibile.</span>';
  }
  return raw;
});

const selectedVoiceAudioUrl = computed(() => {
  const fileId = selectedVoice.value?.voce_audio?.id;
  return fileId ? `/assets/${fileId}` : '';
});

const filteredVoices = computed(() => {
  const term = String(voiceSearch.value || '').trim().toLowerCase();
  if (!term) return voices.value;
  return voices.value.filter((voice) => {
    const name = String(voice.nome || '').toLowerCase();
    return name.includes(term);
  });
});

const defaultLanguageLabel = computed(() => {
  const lang = languages.value.find((item) => item.codice === defaultLanguageCode.value);
  if (!lang) return 'Seleziona una lingua';
  return lang.lingua || lang.codice;
});

const extraLanguagesLabel = computed(() => {
  const selected = extraLanguageCodes.value.filter(
    (code) => code && code !== defaultLanguageCode.value
  );
  if (!selected.length) return 'Nessuna lingua aggiuntiva';
  const labels = selected
    .map((code) => languages.value.find((item) => item.codice === code))
    .filter(Boolean)
    .map((item) => item.lingua || item.codice);
  return labels.length ? labels.join(', ') : 'Lingue selezionate';
});

const languagesDirty = computed(() => {
  const normalizedDefault = defaultLanguageCode.value || '';
  const normalizedExtras = normalizeLanguageCodes(
    extraLanguageCodes.value,
    normalizedDefault
  );
  const detectChanged =
    detectLanguage.value !== savedDetectLanguage.value ||
    JSON.stringify(detectConfig.value || null) !==
      JSON.stringify(savedDetectConfig.value || null);
  return (
    normalizedDefault !== (savedDefaultLanguageCode.value || '') ||
    !areSameCodes(normalizedExtras, savedExtraLanguageCodes.value) ||
    detectChanged
  );
});

const filteredDefaultLanguages = computed(() => {
  const term = String(defaultSearch.value || '').trim().toLowerCase();
  if (!term) return languages.value;
  return languages.value.filter((item) => {
    const name = String(item.lingua || '').toLowerCase();
    const code = String(item.codice || '').toLowerCase();
    return name.includes(term) || code.includes(term);
  });
});

const filteredExtraLanguages = computed(() => {
  const term = String(extrasSearch.value || '').trim().toLowerCase();
  if (!term) return languages.value;
  return languages.value.filter((item) => {
    const name = String(item.lingua || '').toLowerCase();
    const code = String(item.codice || '').toLowerCase();
    return name.includes(term) || code.includes(term);
  });
});

const detectEnabled = computed(() => detectLanguage.value);

function formatTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function setSaved(flagRef, timerRef) {
  flagRef.value = true;
  if (timerRef) clearTimeout(timerRef);
  return setTimeout(() => {
    flagRef.value = false;
  }, 2000);
}

function getDefaultVoiceId(items) {
  if (!items.length) return '';
  const antonio = items.find(
    (voice) => (voice.nome || '').trim().toLowerCase() === 'antonio'
  );
  return (antonio || items[0]).id || '';
}

async function getCurrentUser() {
  if (currentUser.value) return currentUser.value;
  try {
    const res = await api.get('/users/me', {
      params: { fields: ['id', 'email'] },
    });
    currentUser.value = res?.data?.data || null;
    return currentUser.value;
  } catch (e) {
    return null;
  }
}

function hashString(value) {
  if (!value) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAvatarStyle(voice) {
  const palette = [
    { bg: '#dbeafe', fg: '#1d4ed8' },
    { bg: '#dcfce7', fg: '#15803d' },
    { bg: '#fef3c7', fg: '#b45309' },
    { bg: '#fce7f3', fg: '#be185d' },
    { bg: '#ede9fe', fg: '#6d28d9' },
    { bg: '#fee2e2', fg: '#b91c1c' },
  ];
  const key = voice?.id || voice?.nome || 'voice';
  const index = hashString(String(key)) % palette.length;
  const { bg, fg } = palette[index];
  return { background: bg, color: fg };
}

async function loadVoices() {
  voiceLoading.value = true;
  voiceError.value = '';
  try {
    const preferredVoiceElevenlabsId = await resolveClienteVoiceId();
    const res = await api.get('/items/voci_agente', {
      params: {
        fields: [
          'id',
          'nome',
          'descrizione',
          'id_elevenlabs',
          'voce_audio.id',
          'voce_audio.filename_download',
        ],
        limit: -1,
        sort: ['nome'],
      },
    });
    voices.value = res?.data?.data || [];
    if (preferredVoiceElevenlabsId) {
      const match = voices.value.find(
        (voice) => voice.id_elevenlabs === preferredVoiceElevenlabsId
      );
      if (match?.id) {
        selectedVoiceId.value = match.id;
        return;
      }
    }
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

function handleVoiceSelection() {
  voiceError.value = '';
}

function openVoicePanel() {
  if (voiceLoading.value) return;
  voicePanelOpen.value = true;
  voiceSearch.value = '';
}

function closeVoicePanel() {
  voicePanelOpen.value = false;
  voiceSearch.value = '';
}

function selectVoiceFromPanel(voice) {
  selectedVoiceId.value = voice?.id || '';
  handleVoiceSelection();
}

function parseLanguageValues(values) {
  if (Array.isArray(values)) return values;
  if (typeof values === 'string') {
    try {
      const parsed = JSON.parse(values);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

function normalizeLanguageCodes(values, defaultCode) {
  const codes = parseLanguageValues(values);
  const normalized = codes
    .map((code) => String(code || '').trim())
    .filter(Boolean)
    .filter((code) => code !== defaultCode);
  return Array.from(new Set(normalized));
}

function areSameCodes(a, b) {
  const left = normalizeLanguageCodes(a, '');
  const right = normalizeLanguageCodes(b, '');
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function getErrorMessage(error) {
  if (!error) return 'Errore sconosciuto';
  const apiMessage = error?.response?.data?.errors?.[0]?.message;
  return apiMessage || error?.message || String(error);
}

function closeLanguagePanels() {
  defaultPanelOpen.value = false;
  extrasPanelOpen.value = false;
  defaultSearch.value = '';
  extrasSearch.value = '';
}

function openDefaultPanel() {
  if (languagesLoading.value) return;
  defaultPanelOpen.value = true;
  extrasPanelOpen.value = false;
  defaultSearch.value = '';
}

function openExtrasPanel() {
  if (languagesLoading.value) return;
  extrasPanelOpen.value = true;
  defaultPanelOpen.value = false;
  extrasSearch.value = '';
}

function selectDefaultLanguage(lang) {
  if (isDefaultLanguageDisabled(lang)) return;
  defaultLanguageCode.value = lang?.codice || '';
  extraLanguageCodes.value = normalizeLanguageCodes(
    extraLanguageCodes.value,
    defaultLanguageCode.value
  );
  closeLanguagePanels();
}

function isExtraSelected(code) {
  return extraLanguageCodes.value.includes(code);
}

function toggleExtraLanguage(lang) {
  const code = lang?.codice || '';
  if (!code || code === defaultLanguageCode.value) return;
  if (isExtraSelected(code)) {
    extraLanguageCodes.value = extraLanguageCodes.value.filter((item) => item !== code);
  } else {
    extraLanguageCodes.value = normalizeLanguageCodes(
      [...extraLanguageCodes.value, code],
      defaultLanguageCode.value
    );
  }
}

function isDefaultLanguageDisabled(lang) {
  const code = String(lang?.codice || '').toLowerCase();
  const name = String(lang?.lingua || '').toLowerCase();
  return code === 'en' || code.startsWith('en-') || name.includes('inglese') || name.includes('english');
}

function openDetectPanel() {
  if (!detectEnabled.value) return;
  if (!detectConfig.value) {
    detectConfig.value = { ...defaultDetectConfig };
  }
  detectPanelOpen.value = true;
}

function closeDetectPanel() {
  detectPanelOpen.value = false;
}

function onAudioLoaded() {
  audioDuration.value = audioRef.value?.duration || 0;
}

function onAudioTimeUpdate() {
  audioCurrent.value = audioRef.value?.currentTime || 0;
}

function onAudioEnded() {
  audioPlaying.value = false;
  audioCurrent.value = audioDuration.value || 0;
}

async function toggleAudio() {
  if (!audioRef.value) return;
  if (audioPlaying.value) {
    audioRef.value.pause();
    audioPlaying.value = false;
    return;
  }
  try {
    await audioRef.value.play();
    audioPlaying.value = true;
  } catch (e) {
    audioPlaying.value = false;
  }
}

function onAudioSeek(event) {
  const nextTime = Number(event.target.value || 0);
  audioCurrent.value = nextTime;
  if (audioRef.value) {
    audioRef.value.currentTime = nextTime;
  }
}

async function handleSavePrompt() {
  await savePrompt();
  if (!promptError.value && !promptEditing.value) {
    promptSavedTimer = setSaved(promptSaved, promptSavedTimer);
  }
}

async function handleSaveFirstMessage() {
  await saveFirstMessage();
  if (!promptError.value && !firstMessageEditing.value) {
    firstMessageSavedTimer = setSaved(firstMessageSaved, firstMessageSavedTimer);
  }
}

async function resolveClienteId() {
  try {
    const aziendaValue = selectedAzienda?.value;
    if (!aziendaValue) return null;
    const baseParams = {
      fields: ['id'],
      limit: 1,
      _t: Date.now(),
    };

    const scoped = await api.get('/items/clienti', {
      params: {
        ...baseParams,
        filter: { azienda: { _eq: aziendaValue } },
      },
    });
    const scopedId = scoped?.data?.data?.[0]?.id || null;
    if (scopedId) return scopedId;

    return null;
  } catch (e) {
    return null;
  }
}

async function resolveClienteVoiceId() {
  try {
    const aziendaValue = selectedAzienda?.value;
    const baseParams = {
      fields: ['id_voce_agente'],
      limit: 1,
      _t: Date.now(),
    };

    if (aziendaValue) {
      const scoped = await api.get('/items/clienti', {
        params: {
          ...baseParams,
          filter: { azienda: { _eq: aziendaValue } },
        },
      });
      const scopedVoice = scoped?.data?.data?.[0]?.id_voce_agente || null;
      if (scopedVoice) return scopedVoice;
    }

    const fallbackUser = await api.get('/items/clienti', {
      params: {
        ...baseParams,
        filter: userCandidates.length
          ? { id_user: { _in: userCandidates } }
          : { id_user: { _eq: '$CURRENT_USER' } },
      },
    });
    const fallbackUserVoice = fallbackUser?.data?.data?.[0]?.id_voce_agente || null;
    if (fallbackUserVoice) return fallbackUserVoice;

    if (aziendaValue) {
      const fallbackAzienda = await api.get('/items/clienti', {
        params: {
          ...baseParams,
          filter: { azienda: { _eq: aziendaValue } },
        },
      });
      return fallbackAzienda?.data?.data?.[0]?.id_voce_agente || null;
    }

    return null;
  } catch (e) {
    return null;
  }
}

async function saveVoiceSelection() {
  voiceError.value = '';
  const voiceId = selectedVoiceId.value;
  if (!voiceId || voiceSaving.value) return;
  if (!selectedAzienda?.value) {
    voiceError.value = "Seleziona un'azienda prima di salvare.";
    return;
  }

  const clienteId = await resolveClienteId();
  if (!clienteId) {
    voiceError.value = 'Impossibile recuperare il cliente.';
    return;
  }

  const elevenLabsId = selectedVoice.value?.id_elevenlabs || null;
  if (!elevenLabsId) {
    voiceError.value = 'La voce selezionata non ha un id ElevenLabs.';
    return;
  }

  voiceSaving.value = true;

  try {
    await api.patch(`/items/clienti/${clienteId}`, {
      id_voce_agente: elevenLabsId,
    });
    voiceSavedTimer = setSaved(voiceSaved, voiceSavedTimer);
  } catch (e) {
    voiceError.value = 'Errore durante il salvataggio della voce.';
  } finally {
    voiceSaving.value = false;
  }
}

async function resolveAgenteId() {
  try {
    const clienteId = await resolveClienteId();
    if (!clienteId) return null;
    const res = await api.get(`/items/clienti/${clienteId}`, {
      params: { fields: ['agent_elevenlabs'] },
    });
    const agenteExternalId = res?.data?.data?.agent_elevenlabs || null;
    if (!agenteExternalId) return null;
    const agenteLookup = await api.get('/items/agenti', {
      params: {
        fields: ['id'],
        limit: 1,
        filter: {
          id_agente: { _eq: agenteExternalId },
        },
      },
    });
    const resolvedId = agenteLookup?.data?.data?.[0]?.id || null;
    if (resolvedId) return resolvedId;
    const fallback = await api.get(`/items/agenti/${agenteExternalId}`, {
      params: { fields: ['id'] },
    });
    return fallback?.data?.data?.id || null;
  } catch (e) {
    return null;
  }
}

async function loadLingue() {
  languagesLoading.value = true;
  languagesError.value = '';
  try {
    const res = await api.get('/items/lingue', {
      params: {
        fields: ['lingua', 'codice'],
        limit: -1,
        sort: ['lingua'],
      },
    });
    languages.value = res?.data?.data || [];
    if (!defaultLanguageCode.value) {
      const italian = languages.value.find(
        (item) => String(item.codice || '').toLowerCase() === 'it'
      );
      if (italian?.codice) {
        defaultLanguageCode.value = italian.codice;
      }
    }
  } catch (e) {
    languagesError.value = 'Errore caricamento lingue.';
    languages.value = [];
  } finally {
    languagesLoading.value = false;
  }
}

async function loadLingueAgente() {
  try {
    const agenteId = await resolveAgenteId();
    if (!agenteId) return null;
    const res = await api.get(`/items/agenti/${agenteId}`, {
      params: { fields: ['lingua_default', 'lingue_extra', 'detect_language', 'detect_config'] },
    });
    return res?.data?.data || null;
  } catch (e) {
    return null;
  }
}

async function hydrateLingueCliente() {
  const data = await loadLingueAgente();
  const defaultCode = data?.lingua_default ? String(data.lingua_default) : 'it';
  const extras = normalizeLanguageCodes(data?.lingue_extra || [], defaultCode);
  defaultLanguageCode.value = defaultCode;
  extraLanguageCodes.value = extras;
  savedDefaultLanguageCode.value = defaultCode;
  savedExtraLanguageCodes.value = extras;
  detectLanguage.value = Boolean(data?.detect_language);
  if (detectLanguage.value) {
    detectConfig.value = {
      ...baseDetectConfig,
      ...(data?.detect_config || {}),
      description: data?.detect_config?.description || '',
    };
  } else {
    detectConfig.value = null;
  }
  if (detectLanguage.value && !data?.detect_config) {
    detectConfig.value = { ...defaultDetectConfig };
  }
  savedDetectLanguage.value = detectLanguage.value;
  savedDetectConfig.value = detectConfig.value ? { ...detectConfig.value } : null;
}

async function saveLanguageSelection() {
  languagesError.value = '';
  if (languagesSaving.value) return;
  const agenteId = await resolveAgenteId();
  if (!agenteId) {
    languagesError.value = 'Impossibile recuperare l\'agente.';
    await sendLingueWebhook({
      success: false,
      error: languagesError.value,
      agenteId: null,
    });
    return;
  }
  const defaultCode = defaultLanguageCode.value || 'it';
  const extras = normalizeLanguageCodes(extraLanguageCodes.value, defaultCode);
  const extrasPayload = extras.length ? extras : null;
  const nextDetectConfig = detectLanguage.value
    ? {
        ...baseDetectConfig,
        ...(detectConfig.value || {}),
        description: detectConfig.value?.description || '',
      }
    : null;
  if (detectLanguage.value && !detectConfig.value) {
    detectConfig.value = { ...defaultDetectConfig };
  }
  languagesSaving.value = true;
  try {
    await api.patch(`/items/agenti/${agenteId}`, {
      lingua_default: defaultCode,
      lingue_extra: extrasPayload,
      detect_language: detectLanguage.value,
      detect_config: nextDetectConfig,
    });
    savedDefaultLanguageCode.value = defaultCode;
    savedExtraLanguageCodes.value = extras;
    savedDetectLanguage.value = detectLanguage.value;
    savedDetectConfig.value = nextDetectConfig ? { ...nextDetectConfig } : null;
    languagesSavedTimer = setSaved(languagesSaved, languagesSavedTimer);
    await sendLingueWebhook({
      success: true,
      error: null,
      agenteId,
    });
  } catch (e) {
    const errorMessage = getErrorMessage(e);
    languagesError.value = 'Errore durante il salvataggio delle lingue.';
    await sendLingueWebhook({
      success: false,
      error: errorMessage,
      agenteId,
    });
  } finally {
    languagesSaving.value = false;
  }
}

async function fetchAgenteRow(agenteId) {
  if (!agenteId) return null;
  try {
    const res = await api.get(`/items/agenti/${agenteId}`, {
      params: { fields: ['*'] },
    });
    return res?.data?.data || null;
  } catch (e) {
    return null;
  }
}

async function sendLingueWebhook({ success, error, agenteId }) {
  try {
    const agente = await fetchAgenteRow(agenteId);
    await fetch(
      'https://n8n.srv1075424.hstgr.cloud/webhook/10e12952-2c97-46f1-bf96-a8c27e46caca',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success,
          error,
          agenteId,
          agente,
        }),
      }
    );
  } catch (e) {
    // Silent fail: webhook should not block UI.
  }
}

async function toggleDetectLanguage() {
  const nextValue = !detectLanguage.value;
  detectLanguage.value = nextValue;
  if (nextValue && !detectConfig.value) {
    detectConfig.value = { ...defaultDetectConfig };
  }
}

onMounted(() => {
  loadPrompt();
  loadVoices();
  loadLingue();
  hydrateLingueCliente();
});

// Ricarica prompt e voce quando cambia l'azienda
watch(
  () => selectedAzienda?.value,
  () => {
    promptValue.value = '';
    firstMessageValue.value = '';
    promptDraft.value = '';
    firstMessageDraft.value = '';
    promptId.value = null;
    promptError.value = '';
    selectedVoiceId.value = '';
    defaultLanguageCode.value = '';
    extraLanguageCodes.value = [];
    savedDefaultLanguageCode.value = '';
    savedExtraLanguageCodes.value = [];
  detectLanguage.value = false;
  detectConfig.value = null;
  savedDetectLanguage.value = false;
  savedDetectConfig.value = null;
    loadPrompt();
    loadVoices();
    loadLingue();
    hydrateLingueCliente();
  },
  { immediate: true }
);

watch(selectedVoiceAudioUrl, () => {
  if (audioRef.value) {
    audioRef.value.pause();
    audioRef.value.currentTime = 0;
  }
  audioPlaying.value = false;
  audioCurrent.value = 0;
  audioDuration.value = 0;
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

.btn-success {
  border-color: #22c55e;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 1px 2px rgba(34, 197, 94, 0.2), 0 1px 3px rgba(34, 197, 94, 0.1);
}

.voice-panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.voice-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 34px;
}

.voice-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  cursor: pointer;
  text-align: left;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.voice-compact:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.voice-compact-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.voice-compact-text {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.voice-compact-icon {
  font-size: 18px;
  color: var(--foreground-subdued, #6b7280);
}

.voice-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.voice-overlay-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
}

.voice-panel-drawer {
  position: relative;
  width: min(640px, 100%);
  height: 100%;
  background: var(--background, #ffffff);
  box-shadow: -12px 0 24px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  padding: 20px;
  z-index: 1;
}

.voice-panel-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.voice-panel-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--foreground, #1a1a1a);
}

.voice-panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.voice-panel-close {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  font-size: 18px;
  cursor: pointer;
}

.voice-panel-search {
  margin-bottom: 12px;
}

.voice-panel-search-input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  color: var(--foreground, #1a1a1a);
}

.voice-panel-search-input:focus {
  outline: none;
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.12);
}

.voice-panel-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px;
  min-height: 0;
}

.voice-panel-list {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 6px;
}

.voice-panel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}

.voice-panel-item:hover:not(:disabled) {
  background: var(--background-subdued, #f9fafb);
  border-color: var(--border-color-subdued, #e5e7eb);
}

.voice-panel-item--selected {
  background: #f8fafc;
  border-color: var(--border-color-subdued, #e5e7eb);
}

.voice-panel-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.voice-panel-item-name {
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
}

.voice-panel-item-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
}

.voice-panel-check {
  font-size: 14px;
  font-weight: 700;
  color: #22c55e;
}

.voice-panel-empty {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
}

.voice-panel-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.voice-panel-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
}

.voice-panel-preview-text {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.voice-save--top {
  margin-top: 0;
  height: 36px;
  padding: 0 14px;
  font-size: 13px;
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
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.voice-preview-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
}

.voice-badge {
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

.voice-save {
  margin-top: 8px;
  height: 44px;
  border-radius: 12px;
  padding: 0 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #5e72e4;
  background: linear-gradient(135deg, #5e72e4 0%, #7c8de8 100%);
  color: #fff;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(94, 114, 228, 0.2), 0 1px 3px rgba(94, 114, 228, 0.1);
}

.voice-save:hover:not(:disabled) {
  box-shadow: 0 4px 6px rgba(94, 114, 228, 0.25), 0 2px 4px rgba(94, 114, 228, 0.15);
  transform: translateY(-1px);
}

.voice-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.voice-save--success {
  border-color: #22c55e;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 1px 2px rgba(34, 197, 94, 0.2), 0 1px 3px rgba(34, 197, 94, 0.1);
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

.voice-description :deep(p) {
  margin: 0 0 10px;
}

.voice-description :deep(p:last-child) {
  margin-bottom: 0;
}

.voice-description :deep(ul),
.voice-description :deep(ol) {
  margin: 0 0 10px 18px;
}

.voice-description-empty {
  color: var(--foreground-subdued, #6b7280);
}

.voice-audio {
  display: none;
}

.voice-audio-player {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
}

.voice-audio-btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.voice-audio-icon {
  width: 16px;
  height: 16px;
  color: #5e72e4;
}

.voice-audio-range {
  width: 100%;
  accent-color: #5e72e4;
}

.voice-audio-time {
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
  white-space: nowrap;
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

.language-panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.language-panel-header {
  margin-top: 0;
  margin-bottom: 0;
}

.language-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.language-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  cursor: pointer;
  text-align: left;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}

.language-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.language-trigger-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.language-trigger-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.language-trigger-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
}

.language-trigger-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
}

.language-trigger-icon {
  font-size: 18px;
  color: var(--foreground-subdued, #6b7280);
}

.language-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.language-overlay-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
}

.language-panel-drawer {
  position: relative;
  width: min(440px, 100%);
  height: 100%;
  background: var(--background, #ffffff);
  box-shadow: -12px 0 24px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  padding: 20px;
  z-index: 1;
}

.language-panel-drawer .language-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.language-panel-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--foreground, #1a1a1a);
}

.language-panel-close {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  font-size: 18px;
  cursor: pointer;
}

.language-panel-search {
  margin-bottom: 12px;
}

.language-panel-search-input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  color: var(--foreground, #1a1a1a);
}

.language-panel-search-input:focus {
  outline: none;
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.12);
}

.language-panel-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 6px;
}

.language-panel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}

.language-panel-item:hover:not(:disabled) {
  background: var(--background-subdued, #f9fafb);
  border-color: var(--border-color-subdued, #e5e7eb);
}

.language-panel-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.language-panel-item--selected {
  background: #f8fafc;
  border-color: var(--border-color-subdued, #e5e7eb);
}

.language-panel-item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.language-panel-note {
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: lowercase;
}

.language-panel-check {
  font-size: 14px;
  font-weight: 700;
  color: #22c55e;
}

.language-panel-item--checkbox {
  gap: 12px;
}

.language-panel-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #d1d5db);
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.language-panel-checkbox--active {
  background: #5e72e4;
  border-color: #5e72e4;
  box-shadow: inset 0 0 0 2px #ffffff;
}

.language-panel-checkbox--disabled {
  background: #f1f5f9;
  border-color: #cbd5f5;
}

.language-empty {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
}

.detect-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
}

.detect-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detect-config-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.detect-config-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.detect-config-icon {
  color: #5e72e4;
  font-size: 18px;
}

.detect-config-btn :deep(.v-icon) {
  color: #5e72e4;
}

.detect-toggle {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #e5e7eb;
  position: relative;
  cursor: pointer;
  padding: 0;
}

.detect-toggle[aria-checked='true'] {
  background: #5e72e4;
  border-color: #5e72e4;
}

.detect-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.detect-toggle[aria-checked='true'] .detect-toggle-thumb {
  transform: translateX(20px);
}

.detect-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.detect-overlay-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
}

.detect-panel-drawer {
  position: relative;
  width: 33vw;
  min-width: 320px;
  max-width: 480px;
  height: 100%;
  background: var(--background, #ffffff);
  box-shadow: -12px 0 24px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  padding: 20px;
  z-index: 1;
}

.detect-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.detect-panel-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--foreground, #1a1a1a);
}

.detect-panel-close {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  font-size: 18px;
  cursor: pointer;
}

.detect-panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detect-field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.detect-field-textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  color: var(--foreground, #1a1a1a);
  background: #f8fafc;
  resize: none;
}

.detect-field-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--foreground, #1a1a1a);
}


.language-save-row {
  display: flex;
  justify-content: flex-end;
}

.voice-save--compact {
  width: auto;
  padding: 0 16px;
  height: 40px;
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
