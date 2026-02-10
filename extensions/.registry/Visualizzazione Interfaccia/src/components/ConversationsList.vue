<template>
  <div class="conversations-sidebar">
    <div class="sidebar-header">
      <h2>Contatti</h2>
      <div class="sidebar-controls">
        <v-input
          v-model="searchTextModel"
          placeholder="Cerca per nome / telefono / interesse…"
          class="search-input"
          @keydown="searchHandlers.handleKeydown"
          @keyup="searchHandlers.handleKeyup"
          @input="searchHandlers.handleInput"
        >
          <template #prepend>
            <v-icon name="search" />
          </template>
        </v-input>
        <div class="control-row">
          <v-select
            v-model="bookingFilterModel"
            :items="[
              { text: 'Prenotazione: Tutti', value: 'ALL' },
              { text: 'Prenotazione: SI', value: 'SI' },
              { text: 'Prenotazione: NO', value: 'NO' }
            ]"
            item-text="text"
            item-value="value"
            class="control-select"
          />
          <v-select
            v-model="interestFilterModel"
            :items="[
              { text: 'Interesse: Tutti', value: 'ALL' },
              { text: 'Interesse: Positivo', value: 'POSITIVO' },
              { text: 'Interesse: Negativo', value: 'NEGATIVO' }
            ]"
            item-text="text"
            item-value="value"
            class="control-select"
          />
        </div>
        <v-select
          v-model="sortOptionModel"
          :items="[
            { text: 'Ordina: Più recenti', value: 'date_desc' },
            { text: 'Ordina: Meno recenti', value: 'date_asc' },
            { text: 'Ordina: Nome (A → Z)', value: 'name_asc' },
            { text: 'Ordina: Nome (Z → A)', value: 'name_desc' }
          ]"
          item-text="text"
          item-value="value"
        />
      </div>
    </div>

    <div class="conversations-list">
      <div v-if="loading" class="loading">
        <v-progress-circular indeterminate small />
        <span>Caricamento...</span>
      </div>
      <div
        v-else-if="visibleConversations.length === 0"
        class="empty-conversations-state"
      >
        <div class="empty-state-icon-wrapper">
          <v-icon name="phone_in_talk" class="empty-state-icon" />
        </div>
        <h3 class="empty-state-title">Nessuna chiamata disponibile</h3>
        <p class="empty-state-description">
          Non ci sono chiamate per l'azienda selezionata al momento.
        </p>
        <p class="empty-state-hint">
          Quando arriverà una nuova chiamata, comparirà automaticamente in questa lista.
        </p>
      </div>
      <div
        v-for="conversation in visibleConversations"
        :key="conversation.id"
        :class="['conversation-item', { active: activeConversationId === conversation.id }]"
        @click="$emit('select', conversation)"
      >
        <div class="conversation-avatar">
          {{ getInitials(getField(conversation, 'nome')) }}
        </div>
        <div class="conversation-content">
          <div class="conversation-header">
            <span class="conversation-name">
              {{ getField(conversation, 'nome') || 'Contatto senza nome' }}
            </span>
            <span class="conversation-date">
              {{ getDateTime(conversation.date_created) }}
            </span>
          </div>
          <div class="conversation-tags">
            <span
              v-if="getBookingTag(conversation).text"
              :class="['tag-pill', `tag-pill--${getBookingTag(conversation).type}`]"
            >
              {{ getBookingTag(conversation).text }}
            </span>
            <span
              v-if="getCallTag(conversation)"
              :class="['tag-pill', `tag-pill--${getCallTag(conversation).type}`]"
            >
              {{ getCallTag(conversation).text }}
            </span>
            <span v-if="getDurationTag(conversation)" class="tag-pill tag-pill--neutral">
              {{ getDurationTag(conversation) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { createSearchHandler } from '../utils/inputHandlers';
import { getField as getFieldUtil, getInitials, formatTime, formatDate, formatDuration, normalizeYesNo } from '../utils/conversationUtils';

const props = defineProps({
  visibleConversations: {
    type: Array,
    required: true
  },
  activeConversationId: {
    type: [String, Number],
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  searchText: {
    type: String,
    required: true
  },
  bookingFilter: {
    type: String,
    required: true
  },
  interestFilter: {
    type: String,
    required: true
  },
  sortOption: {
    type: String,
    required: true
  },
  fieldNames: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:searchText', 'update:bookingFilter', 'update:interestFilter', 'update:sortOption', 'select']);

const searchTextModel = computed({
  get: () => props.searchText,
  set: (value) => emit('update:searchText', value)
});

const bookingFilterModel = computed({
  get: () => props.bookingFilter,
  set: (value) => emit('update:bookingFilter', value)
});

const interestFilterModel = computed({
  get: () => props.interestFilter,
  set: (value) => emit('update:interestFilter', value)
});

const sortOptionModel = computed({
  get: () => props.sortOption,
  set: (value) => emit('update:sortOption', value)
});

const searchHandlers = createSearchHandler(searchTextModel);

function getField(conversation, fieldName) {
  return getFieldUtil(conversation, fieldName, props.fieldNames);
}

function getBookingTag(conversation) {
  const value = normalizeYesNo(getField(conversation, 'prenotazione_effettuata'));
  if (value === 'SI') {
    return { text: 'Prenotato', type: 'success' };
  }
  if (value === 'NO') {
    return { text: 'Non prenotato', type: 'danger' };
  }
  return { text: 'Prenotazione: N/D', type: 'neutral' };
}

function getDurationTag(conversation) {
  const value = getField(conversation, 'durata_minuti');
  if (!value) return '';
  const formatted = formatDuration(value);
  return formatted === 'N/A' ? '' : `Durata: ${formatted}`;
}

function getDateTime(value) {
  if (!value) return '';
  return `${formatDate(value)} ${formatTime(value)}`;
}

function getCallTag(conversation) {
  const raw = String(getField(conversation, 'tag') || '').trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (normalized === 'richiamare') return { text: 'Richiamare', type: 'yellow' };
  if (normalized === 'trasferita') return { text: 'Trasferita', type: 'purple' };
  if (normalized === 'riattaccato') return { text: 'Riattaccato', type: 'gray' };
  return { text: raw, type: 'neutral' };
}
</script>

<style scoped>
.conversations-sidebar {
  width: 340px;
  background: var(--background);
  border-right: 1px solid var(--border-color-subdued, #e5e7eb);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 1px 0 0 rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background);
}

.sidebar-header h2 {
  margin: 0 0 16px 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--foreground, #111827);
  text-transform: none;
  letter-spacing: -0.4px;
}

.sidebar-controls {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-row {
  display: flex;
  gap: 8px;
}

.search-input {
  width: 100%;
}

.control-select {
  min-width: 0;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: var(--background-page);
}

.conversation-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  background: var(--background);
}

.conversation-item:hover {
  background: var(--background-subdued, #f9fafb);
  border-color: var(--border-color-subdued, #e5e7eb);
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.conversation-item.active {
  background: linear-gradient(90deg, rgba(94, 114, 228, 0.06) 0%, var(--background-subdued, #f9fafb) 100%);
  border-left: 3px solid var(--primary, #5e72e4);
  border-top: 1px solid var(--border-color-subdued, #e5e7eb);
  border-right: 1px solid var(--border-color-subdued, #e5e7eb);
  border-bottom: 1px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 2px 8px rgba(94, 114, 228, 0.08);
}

.conversation-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #5e72e4 0%, #7c8de8 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 15px;
  flex-shrink: 0;
  box-shadow: 0 3px 6px rgba(94, 114, 228, 0.25);
  letter-spacing: 0.3px;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.conversation-name {
  font-weight: 600;
  color: var(--foreground, #111827);
  font-size: 14px;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

.conversation-date {
  font-size: 11px;
  color: var(--foreground-subdued, #6b7280);
  font-weight: 500;
  letter-spacing: 0.2px;
}

.conversation-preview {
  font-size: 13px;
  color: var(--foreground-subdued);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  font-feature-settings: "liga" 1;
}

.conversation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  border: 1px solid transparent;
}

.tag-pill--success {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.35);
}

.tag-pill--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.35);
}

.tag-pill--neutral {
  background: rgba(107, 114, 128, 0.12);
  color: #4b5563;
  border-color: rgba(107, 114, 128, 0.25);
}

.tag-pill--yellow {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.35);
}

.tag-pill--purple {
  background: rgba(139, 92, 246, 0.18);
  color: #7c3aed;
  border-color: rgba(139, 92, 246, 0.35);
}

.tag-pill--gray {
  background: rgba(107, 114, 128, 0.18);
  color: #4b5563;
  border-color: rgba(107, 114, 128, 0.35);
}

.loading {
  padding: 24px 16px;
  text-align: center;
  color: var(--foreground-subdued);
  font-size: 13px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-conversations-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  min-height: 400px;
}

.empty-state-icon-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.1) 0%, rgba(168, 184, 216, 0.1) 100%);
  border: 2px solid rgba(94, 114, 228, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(94, 114, 228, 0.1);
}

.empty-state-icon {
  width: 48px;
  height: 48px;
  color: #5e72e4;
  opacity: 0.7;
}

.empty-state-title {
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--foreground, #1f2937);
  letter-spacing: -0.3px;
}

.empty-state-description {
  margin: 0 0 8px 0;
  font-size: 15px;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.6;
  max-width: 450px;
}

.empty-state-hint {
  margin: 0;
  font-size: 13px;
  color: var(--foreground-subdued, #9ca3af);
  line-height: 1.5;
  font-style: italic;
  max-width: 450px;
}

.conversations-list::-webkit-scrollbar {
  width: 8px;
}

.conversations-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversations-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.conversations-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
  background-clip: padding-box;
}
</style>
