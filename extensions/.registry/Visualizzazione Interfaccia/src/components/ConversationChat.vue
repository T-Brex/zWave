<template>
  <div class="chat-container">
    <div v-if="!activeConversation" class="no-conversation-selected">
      <div class="empty-chat-icon-wrapper">
        <v-icon name="chat_bubble_outline" class="empty-chat-icon" />
      </div>
      <h3 class="empty-chat-title">Nessuna conversazione selezionata</h3>
      <p class="empty-chat-description">
        Seleziona una chiamata dalla lista per visualizzare i dettagli, la trascrizione e le note.
      </p>
    </div>
    <div v-else class="chat-wrapper">
      <div class="chat-header">
        <h3>{{ getField(activeConversation, 'nome') || 'Contatto' }}</h3>
      </div>

      <div class="messages-area" ref="messagesArea">
        <!-- Riassunto -->
        <div v-if="getField(activeConversation, 'riassunto')" class="summary-section">
          <div class="section-label">Riassunto</div>
          <div class="summary-content">
            {{ getField(activeConversation, 'riassunto') }}
          </div>
        </div>

        <!-- Trascrizione con effetto conversazione -->
        <div v-if="parsedMessages.length > 0" class="conversation-messages">
          <div
            v-for="(message, index) in parsedMessages"
            :key="index"
            :class="['message-block', message.type === 'ai' ? 'ai-message' : 'user-message']"
          >
            <div class="message-content-wrapper">
              <div :class="['message-bubble', message.type === 'ai' ? 'ai-bubble' : 'user-bubble']">
                <div class="message-text">{{ message.text }}</div>
              </div>
              <div :class="['message-footer', message.type === 'ai' ? 'ai-footer' : 'user-footer']">
                <span class="message-time">
                  {{ message.time || formatTime(activeConversation.date_created) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Note Aggiuntive alla fine della conversazione -->
          <div v-if="parsedNotes.length > 0" class="notes-in-conversation">
            <div class="notes-in-conversation-label">
              <v-icon name="note" class="section-icon" />
              Note Aggiuntive
            </div>
            <div class="notes-in-conversation-list">
              <NoteItem
                v-for="(note, index) in parsedNotes"
                :key="`note-${index}`"
                :note="note"
                :is-editing="editingNoteIndex === index"
                :saving="savingNote"
                @edit="startEditNote(index)"
                @save="saveEditedNote(index, $event)"
                @cancel="cancelEditNote"
                @delete="deleteNote(index)"
              />
            </div>
          </div>
        </div>

        <!-- Trascrizione raw (se non parsabile) -->
        <div v-else-if="getField(activeConversation, 'trascrizione')" class="transcription-wrapper">
          <div class="message-label">Trascrizione</div>
          <div class="transcription-content">
            {{ getField(activeConversation, 'trascrizione') }}
          </div>

          <!-- Note Aggiuntive alla fine della trascrizione -->
          <div v-if="parsedNotes.length > 0" class="notes-in-conversation">
            <div class="notes-in-conversation-label">
              <v-icon name="note" class="section-icon" />
              Note Aggiuntive
            </div>
            <div class="notes-in-conversation-list">
              <NoteItem
                v-for="(note, index) in parsedNotes"
                :key="`note-${index}`"
                :note="note"
                :is-editing="editingNoteIndex === index"
                :saving="savingNote"
                @edit="startEditNote(index)"
                @save="saveEditedNote(index, $event)"
                @cancel="cancelEditNote"
                @delete="deleteNote(index)"
              />
            </div>
          </div>
        </div>

        <!-- Stato vuoto -->
        <div
          v-if="
            parsedMessages.length === 0 &&
            !getField(activeConversation, 'trascrizione') &&
            !getField(activeConversation, 'riassunto') &&
            parsedNotes.length === 0
          "
          class="empty-state"
        >
          Nessun contenuto disponibile
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import NoteItem from './NoteItem.vue';
import { getField as getFieldUtil, parseTranscription, formatTime } from '../utils/conversationUtils';

const props = defineProps({
  activeConversation: {
    type: Object,
    default: null
  },
  parsedNotes: {
    type: Array,
    default: () => []
  },
  editingNoteIndex: {
    type: Number,
    default: null
  },
  savingNote: {
    type: Boolean,
    default: false
  },
  fieldNames: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['start-edit-note', 'save-edited-note', 'cancel-edit-note', 'delete-note']);

const parsedMessages = computed(() => {
  if (!props.activeConversation) return [];
  const transcription = getFieldUtil(props.activeConversation, 'trascrizione', props.fieldNames);
  return parseTranscription(transcription);
});

function getField(conversation, fieldName) {
  return getFieldUtil(conversation, fieldName, props.fieldNames);
}

function startEditNote(index) {
  emit('start-edit-note', index);
}

function saveEditedNote(index, text) {
  emit('save-edited-note', index, text);
}

function cancelEditNote() {
  emit('cancel-edit-note');
}

function deleteNote(index) {
  emit('delete-note', index);
}

</script>

<style scoped>
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--background);
  overflow: hidden;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.no-conversation-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 60px 40px;
  text-align: center;
}

.empty-chat-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.1) 0%, rgba(168, 184, 216, 0.1) 100%);
  border: 2px solid rgba(94, 114, 228, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(94, 114, 228, 0.1);
}

.empty-chat-icon {
  width: 40px;
  height: 40px;
  color: #5e72e4;
  opacity: 0.7;
}

.empty-chat-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--foreground, #1f2937);
  letter-spacing: -0.3px;
}

.empty-chat-description {
  margin: 0;
  font-size: 14px;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.6;
  max-width: 400px;
}

.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.chat-header {
  padding: 22px 28px;
  border-bottom: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background);
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-header h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  color: var(--foreground, #111827);
  letter-spacing: -0.4px;
}

.messages-area {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
  background: var(--background-page);
  border-left: 1px solid var(--border-color-subdued, #f0f0f0);
  border-right: 1px solid var(--border-color-subdued, #f0f0f0);
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.summary-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--border-color-subdued, #e0e0e0);
  flex-shrink: 0;
  flex-grow: 0;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 14px;
}

.summary-content {
  color: var(--foreground, #1f2937);
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  padding: 18px 20px;
  background: var(--background-subdued, #f9fafb);
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.message-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground-subdued);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.conversation-messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 0;
  position: relative;
  z-index: 0;
}

.notes-in-conversation {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid rgba(245, 158, 11, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-in-conversation-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f59e0b;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.notes-in-conversation-label .section-icon {
  width: 16px;
  height: 16px;
  color: #f59e0b;
}

.notes-in-conversation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-block {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  animation: fadeIn 0.3s ease;
}

.message-block.user-message {
  justify-content: flex-start;
}

.message-block.ai-message {
  justify-content: flex-end;
}

.message-content-wrapper {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.user-message .message-content-wrapper {
  align-items: flex-start;
}

.ai-message .message-content-wrapper {
  align-items: flex-end;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  word-wrap: break-word;
  line-height: 1.6;
  font-size: 14px;
  max-width: 100%;
}

.user-bubble {
  background: linear-gradient(135deg, #5e72e4 0%, #7c8de8 100%);
  color: #ffffff;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 6px rgba(94, 114, 228, 0.25);
}

.ai-bubble {
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
  color: #ffffff;
  border-radius: 16px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 6px rgba(107, 114, 128, 0.2);
}

.message-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  color: inherit;
}

.message-footer {
  margin-top: 8px;
  font-size: 11px;
  color: #999999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.user-footer {
  justify-content: flex-start;
}

.ai-footer {
  justify-content: flex-end;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
  font-weight: 400;
}

.transcription-wrapper {
  margin-bottom: 24px;
  flex-shrink: 0;
  flex-grow: 0;
}

.transcription-wrapper .notes-in-conversation {
  margin-top: 20px;
  padding-top: 16px;
}

.transcription-wrapper .notes-in-conversation {
  margin-top: 20px;
  padding-top: 16px;
}

.transcription-content {
  color: var(--foreground, #1f2937);
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  padding: 18px 20px;
  background: var(--background-subdued, #f9fafb);
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.notes-section-wrapper {
  margin-top: 24px;
  margin-bottom: 0;
  flex-shrink: 0;
  flex-grow: 0;
  position: relative;
  z-index: 2;
  background: var(--background-page);
  padding-top: 8px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.notes-section {
  padding-top: 12px;
  padding-bottom: 8px;
  padding-right: 8px;
  border-top: 3px solid rgba(245, 158, 11, 0.2);
  border-bottom: none;
  position: relative;
  max-height: 200px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  flex-grow: 0;
  background: var(--background-page);
  border-radius: 8px 8px 0 0;
  width: 100%;
  box-sizing: border-box;
}

.notes-section::-webkit-scrollbar {
  width: 6px;
}

.notes-section::-webkit-scrollbar-track {
  background: transparent;
}

.notes-section::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.notes-section::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.notes-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.3) 50%, transparent 100%);
}

.notes-section .section-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f59e0b;
  font-weight: 700;
  margin-bottom: 8px;
  flex-shrink: 0;
  font-size: 10px;
}

.notes-section .section-icon {
  width: 16px;
  height: 16px;
  color: #f59e0b;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 0 0 auto;
  min-height: 0;
  overflow-y: visible;
  overflow-x: hidden;
  max-height: none;
  width: 100%;
  box-sizing: border-box;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--foreground-subdued);
  font-size: 14px;
}

.messages-area::-webkit-scrollbar {
  width: 8px;
}

.messages-area::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
  background-clip: padding-box;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
