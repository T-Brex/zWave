<template>
  <private-view>
    <template #title>
      <div class="module-header">
        <div class="module-icon-wrapper">
          <v-icon name="chat" class="module-icon" />
        </div>
        <div class="module-title-content">
          <span class="module-subtitle">Contenuti</span>
          <h1 class="module-title">Conversazioni</h1>
        </div>
      </div>
    </template>

    <template #navigation>
      <v-list nav>
        <v-list-item
          :class="['nav-item', { 'nav-item--active': isListRoute }]"
          :active="isListRoute"
          :to="basePath"
        >
          <v-list-item-icon>
            <v-icon name="chat" />
          </v-list-item-icon>
          <v-list-item-content>
            Conversazioni
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :class="['nav-item', { 'nav-item--active': isTableRoute }]"
          :active="isTableRoute"
          :to="`${basePath}/tabella`"
        >
          <v-list-item-icon>
            <v-icon name="table" />
          </v-list-item-icon>
          <v-list-item-content>
            Tabella
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :class="['nav-item', { 'nav-item--active': isTaskRoute }]"
          :active="isTaskRoute"
          :to="`${basePath}/task`"
        >
          <v-list-item-icon>
            <v-icon name="checklist" />
          </v-list-item-icon>
          <v-list-item-content>
            Task
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </template>

    <!-- Drawer per selezione aziende -->
    <AziendeDrawer
      v-model="drawerOpen"
      :available-aziende="availableAziende"
      :selected-azienda="selectedAzienda"
      :loading="loadingAziende"
      :error="aziendeError"
      @select="handleSelectAzienda"
      @refresh="loadAziende"
    />

    <div class="conversations-dashboard">
      <v-info
        v-if="conversationsError"
        type="danger"
        icon="error"
        :title="conversationsError"
      >
        <template #append>
          <v-button @click="retry" secondary>
            Riprova
          </v-button>
        </template>
      </v-info>

      <div v-else class="dashboard-content">
        <!-- Colonna Sinistra: Lista Contatti -->
        <ConversationsList
          v-if="fieldNames"
          :visible-conversations="visibleConversations"
          :active-conversation-id="activeConversationId"
          :loading="loadingConversations"
          :search-text="searchText"
          :filters="filters"
          :sort-option="sortOption"
          :field-names="fieldNames"
          @update:search-text="searchText = $event"
          @update:filters="filters = $event"
          @update:sort-option="sortOption = $event"
          @select="selectConversation"
        />

        <!-- Colonna Centro: Trascrizione e Note -->
        <ConversationChat
          v-if="fieldNames"
          :active-conversation="activeConversation"
          :parsed-notes="parsedNotes"
          :editing-note-index="editingNoteIndex"
          :saving-note="savingNote"
          :field-names="fieldNames"
          @start-edit-note="startEditNote"
          @save-edited-note="saveEditedNote"
          @cancel-edit-note="cancelEditNote"
          @delete-note="deleteNote"
        />

        <!-- Colonna Destra: Dettagli Contatto -->
        <ContactDetails
          v-if="fieldNames"
          :active-conversation="activeConversation"
          :selected-azienda="selectedAzienda"
          :field-names="fieldNames"
          @open-drawer="drawerOpen = true"
        />
      </div>
    </div>

    <!-- Dialog conferma eliminazione nota -->
    <v-dialog v-model="showDeleteNoteDialog" @esc="cancelDeleteNote">
      <v-card class="delete-confirm-dialog">
        <v-card-title class="dialog-title">
          <v-icon name="delete" class="dialog-icon delete-icon" />
          Elimina nota
        </v-card-title>
        <v-card-text class="dialog-content">
          <p class="dialog-message">Sei sicuro di voler eliminare questa nota?</p>
          <div v-if="noteToDelete !== null && parsedNotes[noteToDelete]" class="note-preview">
            <div class="note-preview-label">Nota da eliminare:</div>
            <div class="note-preview-text">{{ parsedNotes[noteToDelete] }}</div>
          </div>
          <p class="dialog-warning">Questa azione non può essere annullata.</p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-button @click="cancelDeleteNote" secondary>
            Annulla
          </v-button>
          <v-button @click="confirmDeleteNote" :loading="savingNote" class="delete-button">
            <v-icon name="delete" left />
            Elimina
          </v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </private-view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AziendeDrawer from './components/AziendeDrawer.vue';
import ConversationsList from './components/ConversationsList.vue';
import ConversationChat from './components/ConversationChat.vue';
import ContactDetails from './components/ContactDetails.vue';
import { useAziende } from './composables/useAziende';
import { useConversations } from './composables/useConversations';
import { useNotes } from './composables/useNotes';
import { getFieldNames } from './utils/conversationUtils';

// Aziende
const {
  availableAziende,
  selectedAzienda,
  loadingAziende,
  error: aziendeError,
  loadAziende,
  selectAzienda: selectAziendaUtil
} = useAziende();

const drawerOpen = ref(false);
const aziendaField = ref(null);
const route = useRoute();

const basePath = computed(() => route.path.replace(/\/(tabella|task)$/, ''));
const isTableRoute = computed(() => route.path.endsWith('/tabella'));
const isTaskRoute = computed(() => route.path.endsWith('/task'));
const isListRoute = computed(() => !isTableRoute.value && !isTaskRoute.value);
const requestedConversationId = computed(() => route.query?.id);

const filters = ref([]);

// Conversations
const {
  conversations,
  loadingConversations,
  error: conversationsError,
  searchText,
  sortOption,
  visibleConversations,
  fieldNames: conversationsFieldNames,
  loadConversations
} = useConversations(selectedAzienda, aziendaField, filters);

const fieldNames = computed(() => conversationsFieldNames.value);

// Active conversation
const activeConversationId = ref(null);
const activeConversation = ref(null);

// Notes
const {
  editingNoteIndex,
  editingNoteText,
  savingNote,
  showDeleteNoteDialog,
  noteToDelete,
  parsedNotes,
  error: notesError,
  startEditNote: startEditNoteUtil,
  cancelEditNote: cancelEditNoteUtil,
  saveEditedNote: saveEditedNoteUtil,
  deleteNote: deleteNoteUtil,
  confirmDeleteNote: confirmDeleteNoteUtil
} = useNotes(activeConversation, fieldNames);

// Computed per aggiornare activeConversation quando cambia conversations
watch([conversations, activeConversationId], () => {
  if (activeConversationId.value && conversations.value) {
    const updated = conversations.value.find(c => c.id === activeConversationId.value);
    if (updated) {
      activeConversation.value = updated;
    }
  }
}, { immediate: true });

watch([conversations, requestedConversationId], () => {
  if (!requestedConversationId.value || !conversations.value?.length) return;
  const targetId = String(requestedConversationId.value);
  const found = conversations.value.find(c => String(c.id) === targetId);
  if (found) {
    activeConversationId.value = found.id;
    activeConversation.value = found;
  }
}, { immediate: true });

// Handlers
async function handleSelectAzienda(azienda) {
  selectAziendaUtil(azienda);
  activeConversationId.value = null;
  activeConversation.value = null;
  drawerOpen.value = false;
  await loadConversations();
}

async function selectConversation(conversation) {
  activeConversationId.value = conversation.id;
  activeConversation.value = conversation;
}

function startEditNote(index) {
  startEditNoteUtil(index);
}

function cancelEditNote() {
  cancelEditNoteUtil();
}

async function saveEditedNote(index, text) {
  editingNoteText.value = text;
  await saveEditedNoteUtil(text);
  await loadConversations();
  const updated = conversations.value.find(c => c.id === activeConversationId.value);
  if (updated) {
    activeConversation.value = updated;
  }
}

function deleteNote(index) {
  deleteNoteUtil(index);
}

function cancelDeleteNote() {
  showDeleteNoteDialog.value = false;
  noteToDelete.value = null;
}

async function confirmDeleteNote() {
  await confirmDeleteNoteUtil();
  await loadConversations();
  const updated = conversations.value.find(c => c.id === activeConversationId.value);
  if (updated) {
    activeConversation.value = updated;
  }
}

function retry() {
  loadAziende();
}

// Lifecycle
onMounted(async () => {
  await loadAziende();
  if (availableAziende.value.length > 0 && !selectedAzienda.value) {
    await handleSelectAzienda(availableAziende.value[0].value);
    return;
  }
  if (selectedAzienda.value) {
    await loadConversations();
  }
});

watch(
  () => selectedAzienda.value,
  async (value, prev) => {
    if (!value || value === prev) return;
    await loadConversations();
  }
);
</script>

<style scoped>
.conversations-dashboard {
  display: flex;
  height: 100%;
  min-height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--background-page);
  box-sizing: border-box;
}

.dashboard-content {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Header del modulo con icona - Stile Professionale */
.module-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0;
}

.module-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.1) 0%, rgba(168, 184, 216, 0.1) 100%);
  border: 1px solid rgba(94, 114, 228, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(94, 114, 228, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.module-icon-wrapper svg {
  width: 24px;
  height: 24px;
  color: #5e72e4;
}

.module-icon {
  width: 24px;
  height: 24px;
  color: #5e72e4;
}

.module-title-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.module-subtitle {
  font-size: 11px;
  font-weight: 500;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.4;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.module-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--foreground, #1f2937);
  line-height: 1.2;
  letter-spacing: -0.6px;
}

/* Navigation - Stile Directus */
.nav-item {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
}

.nav-item:hover {
  background: var(--background-subdued, #f9fafb);
}

.nav-item.nav-item--active {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-normal, #e8e8e8);
}

.nav-item.nav-item--active .v-list-item-content {
  color: var(--foreground, #1a1a1a);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.nav-item.nav-item--active .v-icon {
  color: var(--foreground, #1a1a1a);
  opacity: 0.9;
}

/* Dialog conferma eliminazione */
.delete-confirm-dialog {
  max-width: 500px;
  width: 90vw;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 24px 0 24px;
  font-size: 18px;
  font-weight: 600;
  color: var(--foreground, #111827);
  letter-spacing: -0.3px;
}

.dialog-icon {
  width: 24px;
  height: 24px;
}

.dialog-icon.delete-icon {
  color: #ef4444;
}

.dialog-content {
  padding: 20px 24px;
}

.dialog-message {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: var(--foreground, #1f2937);
  line-height: 1.6;
  font-weight: 500;
}

.note-preview {
  margin: 16px 0;
  padding: 14px 16px;
  background: var(--background-subdued, #f9fafb);
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-left: 3px solid #f59e0b;
  border-radius: 8px;
}

.note-preview-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.note-preview-text {
  font-size: 13px;
  color: var(--foreground, #1f2937);
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 150px;
  overflow-y: auto;
}

.dialog-warning {
  margin: 16px 0 0 0;
  font-size: 13px;
  color: #ef4444;
  font-weight: 500;
}

.dialog-actions {
  padding: 16px 24px 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.delete-button {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: #ef4444;
  color: #ffffff;
}

.delete-button:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
</style>
