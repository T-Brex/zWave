<template>
  <div class="conversations-sidebar">
    <div class="sidebar-header">
      <h2>Contatti</h2>
      <div class="sidebar-controls">
        <div class="search-field">
          <v-icon name="search" />
          <input
            v-model="searchTextModel"
            placeholder="Cerca"
            type="text"
            @keydown="searchHandlers.handleKeydown"
            @keyup="searchHandlers.handleKeyup"
            @input="searchHandlers.handleInput"
          />
        </div>
        <div class="control-row control-row--compact">
          <div ref="filterMenuRef" class="filters-button-wrapper">
            <button
              class="filters-button"
              type="button"
              aria-label="Filtri"
              title="Filtri"
              @click.stop="toggleFilterMenu"
            >
              <v-icon name="filter_list" />
            </button>
            <span v-if="activeFiltersCount > 0" class="filters-badge filters-badge-inline">
              Filtri: {{ activeFiltersCount }}
            </span>
            <transition name="filters-pop">
              <div v-if="filterMenuOpen" class="filters-popover" @click.stop>
                <div class="filters-popover-header">
                  <span>Filtri</span>
                  <button class="filters-add-button" type="button" @click.stop="addFilter">
                    + Filtro
                  </button>
                </div>
                <div v-if="localFilters.length === 0" class="filters-empty">
                  Nessun filtro attivo
                </div>
                <div
                  v-for="filter in localFilters"
                  :key="filter.id"
                  class="filter-row"
                >
                  <select
                    v-model="filter.field"
                    class="filter-select"
                    @change="handleFieldChange(filter)"
                  >
                    <option
                      v-for="column in filterColumns"
                      :key="column.value"
                      :value="column.value"
                    >
                      {{ column.label }}
                    </option>
                  </select>
                  <select
                    v-model="filter.operator"
                    class="filter-select"
                  >
                    <option
                      v-for="op in getOperatorOptions(filter.field)"
                      :key="op.value"
                      :value="op.value"
                    >
                      {{ op.label }}
                    </option>
                  </select>
                  <div v-if="operatorNeedsValue(filter.operator)" class="filter-value">
                    <template v-if="getFilterType(filter.field) === 'select'">
                      <select v-model="filter.value" class="filter-input">
                        <option disabled value="">Seleziona…</option>
                        <option
                          v-for="opt in getFieldOptions(filter.field)"
                          :key="opt.value"
                          :value="opt.value"
                        >
                          {{ opt.label }}
                        </option>
                      </select>
                    </template>
                    <template v-else-if="getFilterType(filter.field) === 'number'">
                      <div class="filter-number-group">
                        <input
                          v-model="filter.value"
                          class="filter-input"
                          type="number"
                          placeholder="Valore"
                        />
                        <select
                          v-if="filter.field === 'durata_minuti'"
                          v-model="filter.unit"
                          class="filter-select filter-unit"
                        >
                          <option value="min">min</option>
                          <option value="sec">sec</option>
                        </select>
                      </div>
                      <div v-if="filter.operator === 'between'" class="filter-number-group">
                        <input
                          v-model="filter.valueTo"
                          class="filter-input"
                          type="number"
                          placeholder="E"
                        />
                        <select
                          v-if="filter.field === 'durata_minuti'"
                          v-model="filter.unit"
                          class="filter-select filter-unit"
                        >
                          <option value="min">min</option>
                          <option value="sec">sec</option>
                        </select>
                      </div>
                    </template>
                    <template v-else-if="getFilterType(filter.field) === 'date'">
                      <div class="filter-date-single">
                        <input
                          :value="filter.displayValue"
                          class="filter-input filter-date-input"
                          placeholder="gg/mm/aaaa"
                          @input="updateDateFromText(filter, $event.target.value, 'value')"
                        />
                        <input
                          :ref="el => setDateInputRef(filter, 'value', el)"
                          :value="filter.value"
                          class="filter-date-hidden"
                          type="date"
                          @input="updateDateFromPicker(filter, $event.target.value, 'value')"
                        />
                        <button
                          class="filter-date-button"
                          type="button"
                          @click="openDatePicker(filter, 'value')"
                        >
                          <v-icon name="event" />
                        </button>
                      </div>
                      <div
                        v-if="filter.operator === 'between'"
                        class="filter-date-single"
                      >
                        <input
                          :value="filter.displayValueTo"
                          class="filter-input filter-date-input"
                          placeholder="gg/mm/aaaa"
                          @input="updateDateFromText(filter, $event.target.value, 'valueTo')"
                        />
                        <input
                          :ref="el => setDateInputRef(filter, 'valueTo', el)"
                          :value="filter.valueTo"
                          class="filter-date-hidden"
                          type="date"
                          @input="updateDateFromPicker(filter, $event.target.value, 'valueTo')"
                        />
                        <button
                          class="filter-date-button"
                          type="button"
                          @click="openDatePicker(filter, 'valueTo')"
                        >
                          <v-icon name="event" />
                        </button>
                      </div>
                    </template>
                    <template v-else>
                      <input
                        v-model="filter.value"
                        class="filter-input"
                        type="text"
                        placeholder="Valore"
                      />
                    </template>
                  </div>
                  <button class="filter-remove" type="button" @click.stop="removeFilter(filter.id)">
                    <v-icon name="close" />
                  </button>
                </div>
              </div>
            </transition>
          </div>
          <div class="sort-field" @click="focusSortSelect">
            <select ref="sortSelectRef" v-model="sortOptionModel">
              <option value="date_desc">Ordina: Più recenti</option>
              <option value="date_asc">Ordina: Meno recenti</option>
              <option value="name_asc">Ordina: Nome (A → Z)</option>
              <option value="name_desc">Ordina: Nome (Z → A)</option>
            </select>
            <button class="sort-icon-button" type="button" @click.stop="focusSortSelect">
              <v-icon name="arrow_drop_down" />
            </button>
          </div>
        </div>
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
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
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
  filters: {
    type: Array,
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

const emit = defineEmits(['update:searchText', 'update:filters', 'update:sortOption', 'select']);

const searchTextModel = computed({
  get: () => props.searchText,
  set: (value) => emit('update:searchText', value)
});

const sortOptionModel = computed({
  get: () => props.sortOption,
  set: (value) => emit('update:sortOption', value)
});

const sortSelectRef = ref(null);

const searchHandlers = createSearchHandler(searchTextModel);

const filterMenuOpen = ref(false);
const filterMenuRef = ref(null);
const dateInputRefs = ref({});
const localFilters = ref([]);

const filterColumns = [
  { value: 'nome', label: 'Nome', type: 'text' },
  { value: 'durata_minuti', label: 'Durata (minuti)', type: 'number' },
  { value: 'tag', label: 'Tag', type: 'text' },
  { value: 'interesse', label: 'Interesse', type: 'select' },
  { value: 'prenotazione_effettuata', label: 'Prenotazione', type: 'select' },
  { value: 'data_prenotazione', label: 'Data prenotazione', type: 'date' },
  { value: 'date_created', label: 'Data chiamata', type: 'date' }
];

const filterOperators = {
  text: [
    { value: 'contains', label: 'contiene' },
    { value: 'equals', label: 'uguale a' },
    { value: 'not_equals', label: 'diverso da' },
    { value: 'starts_with', label: 'inizia con' },
    { value: 'ends_with', label: 'finisce con' },
    { value: 'is_empty', label: 'è vuoto' },
    { value: 'is_not_empty', label: 'non è vuoto' }
  ],
  number: [
    { value: 'equals', label: 'uguale a' },
    { value: 'not_equals', label: 'diverso da' },
    { value: 'gt', label: 'maggiore di' },
    { value: 'lt', label: 'minore di' },
    { value: 'between', label: 'tra' },
    { value: 'is_empty', label: 'è vuoto' },
    { value: 'is_not_empty', label: 'non è vuoto' }
  ],
  select: [
    { value: 'is', label: 'è' },
    { value: 'is_not', label: 'non è' },
    { value: 'is_empty', label: 'è vuoto' },
    { value: 'is_not_empty', label: 'non è vuoto' }
  ],
  date: [
    { value: 'is', label: 'è' },
    { value: 'is_not', label: 'non è' },
    { value: 'before', label: 'prima di' },
    { value: 'after', label: 'dopo' },
    { value: 'between', label: 'tra' },
    { value: 'is_empty', label: 'è vuoto' },
    { value: 'is_not_empty', label: 'non è vuoto' }
  ]
};

const activeFiltersCount = computed(() => {
  return localFilters.value.filter(isFilterActive).length;
});

const isSyncingFilters = ref(false);

watch(
  () => props.filters,
  (value) => {
    isSyncingFilters.value = true;
    localFilters.value = Array.isArray(value) ? value.map(filter => ({ ...filter })) : [];
    nextTick(() => {
      isSyncingFilters.value = false;
    });
  },
  { immediate: true }
);

watch(
  localFilters,
  (value) => {
    if (isSyncingFilters.value) return;
    emit('update:filters', value.map(filter => ({ ...filter })));
  },
  { deep: true }
);

function getField(conversation, fieldName) {
  return getFieldUtil(conversation, fieldName, props.fieldNames);
}

function focusSortSelect() {
  if (sortSelectRef.value) {
    sortSelectRef.value.focus();
    if (typeof sortSelectRef.value.showPicker === 'function') {
      sortSelectRef.value.showPicker();
    } else {
      sortSelectRef.value.click();
    }
  }
}

function getFilterType(field) {
  return filterColumns.find(column => column.value === field)?.type || 'text';
}

function getOperatorOptions(field) {
  const type = getFilterType(field);
  return filterOperators[type] || filterOperators.text;
}

function getDefaultOperator(type) {
  return (filterOperators[type] && filterOperators[type][0]?.value) || 'contains';
}

function getFieldOptions(field) {
  if (field === 'prenotazione_effettuata') {
    return [
      { value: 'SI', label: 'Si' },
      { value: 'NO', label: 'No' }
    ];
  }
  if (field === 'interesse') {
    return [
      { value: 'POSITIVO', label: 'Positivo' },
      { value: 'NEGATIVO', label: 'Negativo' }
    ];
  }
  return [];
}

function operatorNeedsValue(operator) {
  return !['is_empty', 'is_not_empty'].includes(operator);
}

function createFilter() {
  const field = filterColumns[0]?.value || 'interesse';
  const type = getFilterType(field);
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    field,
    operator: getDefaultOperator(type),
    value: '',
    valueTo: '',
    unit: field === 'durata_minuti' ? 'min' : null,
    displayValue: '',
    displayValueTo: ''
  };
}

function addFilter() {
  localFilters.value = [...localFilters.value, createFilter()];
}

function removeFilter(id) {
  localFilters.value = localFilters.value.filter(filter => filter.id !== id);
}

function handleFieldChange(filter) {
  const type = getFilterType(filter.field);
  filter.operator = getDefaultOperator(type);
  filter.value = '';
  filter.valueTo = '';
  filter.unit = filter.field === 'durata_minuti' ? 'min' : null;
  filter.displayValue = '';
  filter.displayValueTo = '';
}

function toggleFilterMenu() {
  filterMenuOpen.value = !filterMenuOpen.value;
}

function handleFilterOutsideClick(event) {
  const wrapper = filterMenuRef.value;
  if (!wrapper) return;
  if (wrapper.contains(event.target)) return;
  filterMenuOpen.value = false;
}

function handleFilterKeydown(event) {
  if (event.key === 'Escape') {
    filterMenuOpen.value = false;
  }
}

function formatDateDisplay(value) {
  if (!value) return '';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function parseDateInput(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }
  return '';
}

function updateDateFromPicker(filter, value, key) {
  filter[key] = value || '';
  if (key === 'value') {
    filter.displayValue = formatDateDisplay(value);
  } else {
    filter.displayValueTo = formatDateDisplay(value);
  }
}

function updateDateFromText(filter, value, key) {
  if (key === 'value') {
    filter.displayValue = value;
  } else {
    filter.displayValueTo = value;
  }
  const parsed = parseDateInput(value);
  filter[key] = parsed;
}

function setDateInputRef(filter, key, el) {
  if (!filter?.id) return;
  if (!dateInputRefs.value[filter.id]) {
    dateInputRefs.value[filter.id] = {};
  }
  dateInputRefs.value[filter.id][key] = el;
}

function openDatePicker(filter, key) {
  const ref = dateInputRefs.value?.[filter.id]?.[key];
  if (!ref) return;
  if (typeof ref.showPicker === 'function') {
    ref.showPicker();
  } else {
    ref.focus();
    ref.click();
  }
}

function isFilterActive(filter) {
  if (!filter) return false;
  if (['is_empty', 'is_not_empty'].includes(filter.operator)) return true;
  if (filter.operator === 'between') {
    return !!filter.value && !!filter.valueTo;
  }
  return !!filter.value;
}

onMounted(() => {
  document.addEventListener('click', handleFilterOutsideClick);
  document.addEventListener('keydown', handleFilterKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleFilterOutsideClick);
  document.removeEventListener('keydown', handleFilterKeydown);
});

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
  overflow: visible;
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

.control-row--compact {
  align-items: center;
  gap: 10px;
}

.search-field {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  font: inherit;
  font-size: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--background, #ffffff);
  color: var(--foreground, #1a1a1a);
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
}

.search-field input {
  border: none;
  outline: none;
  width: 100%;
  font: inherit;
  font-size: 14px;
  background: transparent;
  color: inherit;
  padding: 0;
  margin: 0;
}

.search-field:focus-within {
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
}

.control-select {
  min-width: 0;
}

.control-select--compact {
  flex: 1;
  min-width: 0;
}

.sort-field {
  height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  font: inherit;
  font-size: 14px;
  background: var(--background, #ffffff);
  color: var(--foreground, #1a1a1a);
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sort-field select {
  border: none;
  outline: none;
  width: 100%;
  font: inherit;
  font-size: 14px;
  background: transparent;
  color: inherit;
  padding: 0;
  margin: 0;
  appearance: none;
  box-shadow: none;
}

.sort-icon-button {
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: inherit;
}

.sort-icon-button :deep(.v-icon) {
  pointer-events: none;
}

.sort-field select:focus,
.sort-field select:focus-visible {
  outline: none;
  box-shadow: none;
}

.sort-field:focus-within {
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
}

.filters-button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(94, 114, 228, 0.2);
  background: rgba(94, 114, 228, 0.15);
  color: #5e72e4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.filters-button:hover {
  background: rgba(94, 114, 228, 0.2);
}

.filters-button-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  z-index: 40;
}

.filters-badge {
  background: rgba(94, 114, 228, 0.1);
  color: #5e72e4;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
}

.filters-badge-inline {
  margin-left: 2px;
}

.filters-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: max-content;
  min-width: 360px;
  max-width: 520px;
  max-height: 380px;
  overflow: auto;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  transition: width 0.2s ease, max-height 0.2s ease;
}

.filters-popover::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 14px;
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-left: 1px solid var(--border-color-subdued, #e5e7eb);
  border-top: 1px solid var(--border-color-subdued, #e5e7eb);
  transform: rotate(45deg);
}

.filters-pop-enter-active,
.filters-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.filters-pop-enter-from,
.filters-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.filters-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground, #1f2937);
  margin-bottom: 10px;
}

.filters-add-button {
  border: none;
  background: var(--background-subdued, #f3f4f6);
  color: var(--foreground, #1f2937);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
}

.filters-empty {
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
  padding: 6px 2px 2px;
}

.filter-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr) minmax(180px, 1.4fr) auto;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
}

.filter-select,
.filter-input {
  width: 100%;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  font-size: 12px;
  padding: 0 8px;
  color: var(--foreground, #1f2937);
}

.filter-value {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-number-group {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  align-items: center;
}

.filter-unit {
  width: 70px;
}

.filter-date-single {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  align-items: center;
}

.filter-date-input {
  font-size: 12px;
}

.filter-date-hidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.filter-date-button {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background-subdued, #f9fafb);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.filter-remove {
  border: none;
  background: transparent;
  color: var(--foreground-subdued, #6b7280);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.filter-remove:hover {
  color: var(--foreground, #1f2937);
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
