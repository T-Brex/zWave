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

    <AziendeDrawer
      v-model="drawerOpen"
      :available-aziende="availableAziende"
      :selected-azienda="selectedAzienda"
      :loading="loadingAziende"
      :error="aziendeError"
      @select="handleSelectAzienda"
      @refresh="loadAziende"
    />

    <div class="table-dashboard">
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

      <div v-else class="table-content">
        <div class="table-layout">
          <div class="table-main">
            <div class="table-topbar">
              <v-button
                class="azienda-select-button"
                :secondary="!!selectedAzienda"
                :type="selectedAzienda ? 'secondary' : 'primary'"
                @click="drawerOpen = true"
              >
                <v-icon name="business" left />
                <span class="azienda-button-text">
                  {{ selectedAzienda || 'Seleziona azienda' }}
                </span>
                <v-icon name="arrow_drop_down" right />
              </v-button>
            </div>
            <div class="table-searchbar">
              <input
                v-model="searchInput"
                class="table-search"
                placeholder="Cerca…"
              />
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
                    <div v-if="filters.length === 0" class="filters-empty">
                      Nessun filtro attivo
                    </div>
                    <div
                      v-for="filter in filters"
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
                              type="text"
                              placeholder="gg/MM/aaaa"
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
                              aria-label="Apri calendario"
                              @click="openDatePicker(filter, 'value')"
                            >
                              <v-icon name="calendar_today" />
                            </button>
                          </div>
                          <div
                            v-if="filter.operator === 'between'"
                            class="filter-date-single"
                          >
                            <input
                              :value="filter.displayValueTo"
                              class="filter-input filter-date-input"
                              type="text"
                              placeholder="gg/MM/aaaa"
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
                              aria-label="Apri calendario"
                              @click="openDatePicker(filter, 'valueTo')"
                            >
                              <v-icon name="calendar_today" />
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
                      <button
                        class="filter-remove"
                        type="button"
                        aria-label="Rimuovi filtro"
                        @click.stop="removeFilter(filter.id)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <div v-if="loadingConversations" class="loading">
              <v-progress-circular indeterminate small />
              <span>Caricamento...</span>
            </div>

            <div v-else-if="pagedConversations.length === 0" class="empty-state">
              Nessuna chiamata disponibile
            </div>

            <div v-else class="table-wrapper">
              <table class="conversations-table" :class="`density-${density}`">
                <colgroup>
                  <col
                    v-for="column in columns"
                    :key="column.key"
                    :style="{ minWidth: column.width || '160px' }"
                  />
                </colgroup>
                <thead>
                  <tr>
                    <th
                      v-for="column in columns"
                      :key="column.key"
                      :class="getHeaderClass(column)"
                      :draggable="true"
                      @dragstart="handleColumnDragStart(column, $event)"
                      @dragover.prevent
                      @drop="handleColumnDrop(column)"
                      @dragend="handleColumnDragEnd"
                      @click="column.sortable ? toggleSort(column.sortKey || column.key) : null"
                    >
                      <span class="th-content">
                        {{ column.label }}
                        <span v-if="column.sortable" class="sort-indicator">
                          {{ sortIndicator(column.sortKey || column.key) }}
                        </span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="conversation in pagedConversations"
                    :key="conversation.id"
                    :class="{ active: activeConversationId === conversation.id }"
                    @click="selectConversation(conversation)"
                  >
                    <td
                      v-for="column in columns"
                      :key="column.key"
                      :class="getCellClass(column)"
                    >
                      <template v-if="column.key === 'details'">
                        <v-button class="details-button" small secondary @click.stop="goToDetails(conversation)">
                          Dettagli
                          <v-icon name="open_in_new" right />
                        </v-button>
                      </template>
                      <template v-else-if="column.key === 'data_prenotazione'">
                        {{ formatDateTimeDisplay(getField(conversation, 'data_prenotazione')) }}
                      </template>
                      <template v-else-if="column.key === 'immobile'">
                        <a
                          v-if="getImmobileValue(conversation).link"
                          :href="getImmobileValue(conversation).link"
                          target="_blank"
                          rel="noopener"
                        >
                          {{ getImmobileValue(conversation).text }}
                        </a>
                        <span v-else>{{ getImmobileValue(conversation).text }}</span>
                      </template>
                      <template v-else-if="column.key === 'chiamata_spam'">
                        {{ formatSpamValue(getField(conversation, 'chiamata_spam')) }}
                      </template>
                      <template v-else-if="column.key === 'riassunto_preview'">
                        {{ getPreviewValue(getField(conversation, 'riassunto')) }}
                      </template>
                      <template v-else-if="column.key === 'trascrizione_preview'">
                        {{ getPreviewValue(getField(conversation, 'trascrizione')) }}
                      </template>
                      <template v-else-if="column.key === 'prenotazione_effettuata'">
                        {{ getBookingText(conversation) }}
                      </template>
                      <template v-else-if="column.key === 'durata_minuti'">
                        {{ getDurationText(conversation) }}
                      </template>
                      <template v-else-if="column.key === 'date_created'">
                        {{ formatDate(conversation.date_created) }}
                      </template>
                      <template v-else>
                        {{ getField(conversation, column.key) || 'N/A' }}
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="tableConversations.length > 0" class="table-pagination">
              <div class="density-toggle">
                <button
                  v-for="option in densityOptions"
                  :key="option.value"
                  :class="['density-button', { active: density === option.value }]"
                  @click="density = option.value"
                  :title="option.label"
                  type="button"
                >
                  {{ option.symbol }}
                </button>
              </div>
              <div ref="pageSizeWrapperRef" class="page-size-wrapper">
                <button
                  class="page-size-button"
                  type="button"
                  aria-label="Righe per pagina"
                  @click="togglePageSizeMenu"
                >
                  <span class="page-size-value">{{ pageSize }}</span>
                  <v-icon name="arrow_drop_down" />
                </button>
                <div v-if="pageSizeMenuOpen" class="page-size-menu">
                  <button
                    v-for="option in pageSizeOptions"
                    :key="option"
                    class="page-size-option"
                    type="button"
                    @click="setPageSize(option)"
                  >
                    {{ option }}
                  </button>
                </div>
              </div>
              <div class="page-controls">
                <button
                  class="page-button"
                  :disabled="page === 1"
                  @click="page = Math.max(1, page - 1)"
                  type="button"
                  title="Indietro"
                >
                  ←
                </button>
                <span class="page-info">{{ page }} / {{ totalPages }}</span>
                <button
                  class="page-button"
                  :disabled="page >= totalPages"
                  @click="page = Math.min(totalPages, page + 1)"
                  type="button"
                  title="Avanti"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          <ContactDetails
            v-if="isAdmin"
            :active-conversation="activeConversation"
            :selected-azienda="selectedAzienda"
            :field-names="fieldNames"
            @open-drawer="drawerOpen = true"
          />
        </div>
      </div>
    </div>
  </private-view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi } from '@directus/extensions-sdk';
import AziendeDrawer from '../components/AziendeDrawer.vue';
import ContactDetails from '../components/ContactDetails.vue';
import { useAziende } from '../composables/useAziende';
import { useConversations } from '../composables/useConversations';
import { getField as getFieldUtil, formatDate, formatDuration, formatTime, normalizeYesNo, normalizeInterest } from '../utils/conversationUtils';

const route = useRoute();
const router = useRouter();
const basePath = computed(() => route.path.replace(/\/(tabella|task)$/, ''));
const isTableRoute = computed(() => route.path.endsWith('/tabella'));
const isTaskRoute = computed(() => route.path.endsWith('/task'));
const isListRoute = computed(() => !isTableRoute.value && !isTaskRoute.value);

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
const api = useApi();
const currentUserIsAdmin = ref(false);

const activeConversationId = ref(null);
const activeConversation = ref(null);

const {
  conversations,
  loadingConversations,
  error: conversationsError,
  fieldNames: conversationsFieldNames,
  loadConversations
} = useConversations(selectedAzienda, aziendaField);

const fieldNames = computed(() => conversationsFieldNames.value);

const searchInput = ref('');
const searchAll = ref('');
const sortKey = ref('date_created');
const sortDir = ref('desc');
const pageSize = ref(20);
const page = ref(1);
const density = ref('cozy');
const filters = ref([]);
const filterMenuOpen = ref(false);
const filterMenuRef = ref(null);
const dateInputRefs = ref({});

const densityOptions = [
  { value: 'compact', symbol: '≡', label: 'Compatto' },
  { value: 'cozy', symbol: '≣', label: 'Medio' },
  { value: 'comfortable', symbol: '▤', label: 'Comodo' }
];

const columns = ref([
  { key: 'nome', label: 'Nome', sortable: true, width: '180px' },
  { key: 'telefono', label: 'Telefono', sortable: true, width: '150px' },
  { key: 'interesse', label: 'Interesse', sortable: true, width: '140px' },
  { key: 'prenotazione_effettuata', label: 'Prenotazione', sortable: true, width: '160px' },
  { key: 'durata_minuti', label: 'Durata', sortable: true, width: '120px' },
  { key: 'date_created', label: 'Data creazione', sortable: true, width: '150px' },
  { key: 'data_prenotazione', label: 'Data prenotazione', sortable: true, width: '170px' },
  { key: 'immobile', label: 'Immobile', sortable: false, width: '240px' },
  { key: 'chiamata_spam', label: 'Spam', sortable: true, width: '110px' },
  { key: 'riassunto_preview', label: 'Riassunto (preview)', sortable: false, width: '260px' },
  { key: 'trascrizione_preview', label: 'Trascrizione (preview)', sortable: false, width: '260px' },
  { key: 'details', label: 'Dettagli', sortable: false, width: '110px' }
]);
const draggingColumnKey = ref(null);

const filterColumns = [
  { value: 'nome', label: 'Nome', type: 'text' },
  { value: 'telefono', label: 'Telefono', type: 'text' },
  { value: 'interesse', label: 'Interesse', type: 'select' },
  { value: 'prenotazione_effettuata', label: 'Prenotazione', type: 'select' },
  { value: 'durata_minuti', label: 'Durata (minuti)', type: 'number' },
  { value: 'date_created', label: 'Data', type: 'date' },
  { value: 'data_prenotazione', label: 'Data prenotazione', type: 'date' },
  { value: 'chiamata_spam', label: 'Spam', type: 'select' },
  { value: 'riassunto', label: 'Riassunto', type: 'text' },
  { value: 'trascrizione', label: 'Trascrizione', type: 'text' }
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

const isAdmin = computed(() => currentUserIsAdmin.value);

const tableConversations = computed(() => {
  let items = Array.isArray(conversations.value) ? [...conversations.value] : [];

  const searchQuery = searchAll.value.trim().toLowerCase();
  if (searchQuery) {
    items = items.filter(item => {
      const name = String(getField(item, 'nome') || '').toLowerCase();
      const phone = String(getField(item, 'telefono') || '').toLowerCase();
      const interest = String(getField(item, 'interesse') || '').toLowerCase();
      const booking = String(getField(item, 'prenotazione_effettuata') || '').toLowerCase();
      const duration = String(getField(item, 'durata_minuti') || '').toLowerCase();
      const date = item?.date_created ? formatDate(item.date_created).toLowerCase() : '';
      const bookingDate = String(getField(item, 'data_prenotazione') || '').toLowerCase();
      const immobile = String(getImmobileValue(item).text || '').toLowerCase();
      const spam = String(getField(item, 'chiamata_spam') || '').toLowerCase();
      const summary = String(getField(item, 'riassunto') || '').toLowerCase();
      const transcript = String(getField(item, 'trascrizione') || '').toLowerCase();
      return (
        name.includes(searchQuery) ||
        phone.includes(searchQuery) ||
        interest.includes(searchQuery) ||
        booking.includes(searchQuery) ||
        duration.includes(searchQuery) ||
        date.includes(searchQuery) ||
        bookingDate.includes(searchQuery) ||
        immobile.includes(searchQuery) ||
        spam.includes(searchQuery) ||
        summary.includes(searchQuery) ||
        transcript.includes(searchQuery)
      );
    });
  }

  const activeFilters = filters.value.filter(isFilterActive);
  if (activeFilters.length > 0) {
    items = items.filter(item => activeFilters.every(filter => matchesFilter(item, filter)));
  }

  items.sort((a, b) => compareByKey(a, b, sortKey.value, sortDir.value));

  return items;
});

const totalPages = computed(() => {
  const size = pageSize.value || 20;
  return Math.max(1, Math.ceil(tableConversations.value.length / size));
});

const pagedConversations = computed(() => {
  const size = pageSize.value || 20;
  const start = (page.value - 1) * size;
  return tableConversations.value.slice(start, start + size);
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (searchAll.value.trim()) count += 1;
  count += filters.value.filter(isFilterActive).length;
  return count;
});

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
  if (field === 'chiamata_spam') {
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
  const field = filterColumns[0]?.value || 'nome';
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
  filters.value = [...filters.value, createFilter()];
}

function removeFilter(id) {
  filters.value = filters.value.filter(filter => filter.id !== id);
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

function isEmptyValue(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function isFilterActive(filter) {
  if (!filter) return false;
  if (['is_empty', 'is_not_empty'].includes(filter.operator)) return true;
  if (filter.operator === 'between') {
    return !!filter.value && !!filter.valueTo;
  }
  return !!filter.value;
}

function toISODate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function matchesFilter(item, filter) {
  const type = getFilterType(filter.field);
  const operator = filter.operator;
  const rawValue = getField(item, filter.field);

  if (operator === 'is_empty') {
    return isEmptyValue(rawValue);
  }
  if (operator === 'is_not_empty') {
    return !isEmptyValue(rawValue);
  }

  if (type === 'select') {
    const normalized = normalizeYesNo(rawValue);
    const target = normalizeYesNo(filter.value);
    if (!target) return true;
    if (operator === 'is') return normalized === target;
    if (operator === 'is_not') return normalized !== target;
    return true;
  }

  if (type === 'number') {
    const num = Number(rawValue);
    const unit = filter.field === 'durata_minuti' ? (filter.unit || 'min') : 'min';
    const normalize = value => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return NaN;
      return unit === 'sec' ? parsed / 60 : parsed;
    };
    const val = normalize(filter.value);
    if (!Number.isFinite(num)) return false;
    if (operator === 'between') {
      const valTo = normalize(filter.valueTo);
      if (!Number.isFinite(val) || !Number.isFinite(valTo)) return false;
      const min = Math.min(val, valTo);
      const max = Math.max(val, valTo);
      return num >= min && num <= max;
    }
    if (!Number.isFinite(val)) return false;
    if (operator === 'equals') return num === val;
    if (operator === 'not_equals') return num !== val;
    if (operator === 'gt') return num > val;
    if (operator === 'lt') return num < val;
    return true;
  }

  if (type === 'date') {
    const itemDate = toISODate(rawValue || item?.date_created);
    const filterDate = filter.value;
    if (!itemDate) return false;
    if (operator === 'between') {
      const endDate = filter.valueTo;
      if (!filterDate || !endDate) return false;
      const min = filterDate < endDate ? filterDate : endDate;
      const max = filterDate < endDate ? endDate : filterDate;
      return itemDate >= min && itemDate <= max;
    }
    if (!filterDate) return false;
    if (operator === 'is') return itemDate === filterDate;
    if (operator === 'is_not') return itemDate !== filterDate;
    if (operator === 'before') return itemDate < filterDate;
    if (operator === 'after') return itemDate > filterDate;
    return true;
  }

  const fieldText = String(rawValue || '').toLowerCase();
  const searchText = String(filter.value || '').toLowerCase();
  if (!searchText) return true;
  if (operator === 'contains') return fieldText.includes(searchText);
  if (operator === 'equals') return fieldText === searchText;
  if (operator === 'not_equals') return fieldText !== searchText;
  if (operator === 'starts_with') return fieldText.startsWith(searchText);
  if (operator === 'ends_with') return fieldText.endsWith(searchText);
  return true;
}

function getField(conversation, fieldName) {
  return getFieldUtil(conversation, fieldName, fieldNames.value);
}

function formatDateTimeDisplay(value) {
  if (!value) return 'N/D';
  const datePart = formatDate(value);
  const timePart = formatTime(value);
  if (!timePart || timePart === '00:00') {
    return datePart;
  }
  return `${datePart} ${timePart}`;
}

function getImmobileValue(conversation) {
  const code = getField(conversation, 'codice_riferimento');
  if (code) return { text: code, link: null };
  const link = getField(conversation, 'link_immobile_prenotato');
  if (link) return { text: link, link };
  const info = getField(conversation, 'info_immobile');
  if (info) return { text: info, link: null };
  return { text: 'N/D', link: null };
}

function getPreviewValue(value, maxLength = 80) {
  if (!value) return 'N/D';
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatSpamValue(value) {
  if (value === true) return 'Si';
  if (value === false) return 'No';
  const normalized = normalizeYesNo(value);
  if (normalized === 'SI') return 'Si';
  if (normalized === 'NO') return 'No';
  return 'N/D';
}

function getHeaderClass(column) {
  return [
    `col-${column.key}`,
    column.key === 'details' ? 'details-col' : '',
    column.sortable ? sortClass(column.sortKey || column.key) : '',
    draggingColumnKey.value === column.key ? 'is-dragging' : ''
  ].filter(Boolean);
}

function getCellClass(column) {
  return [
    `col-${column.key}`,
    column.key === 'details' ? 'details-col' : '',
    ['riassunto_preview', 'trascrizione_preview'].includes(column.key) ? 'preview-cell' : ''
  ].filter(Boolean);
}

function handleColumnDragStart(column, event) {
  draggingColumnKey.value = column.key;
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function handleColumnDrop(targetColumn) {
  const fromIndex = columns.value.findIndex(col => col.key === draggingColumnKey.value);
  const toIndex = columns.value.findIndex(col => col.key === targetColumn.key);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    draggingColumnKey.value = null;
    return;
  }
  const updated = [...columns.value];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  columns.value = updated;
  draggingColumnKey.value = null;
}

function handleColumnDragEnd() {
  draggingColumnKey.value = null;
}

function getBookingText(conversation) {
  const value = normalizeYesNo(getField(conversation, 'prenotazione_effettuata'));
  if (value === 'SI') return 'Prenotato';
  if (value === 'NO') return 'Non prenotato';
  return 'N/D';
}

function getDurationText(conversation) {
  const value = getField(conversation, 'durata_minuti');
  if (!value) return 'N/A';
  return formatDuration(value);
}

function resetFilters() {
  searchInput.value = '';
  searchAll.value = '';
  sortKey.value = 'date_created';
  sortDir.value = 'desc';
  page.value = 1;
}

async function handleSelectAzienda(azienda) {
  selectAziendaUtil(azienda);
  drawerOpen.value = false;
  await loadConversations();
}

function selectConversation(conversation) {
  activeConversationId.value = conversation.id;
  activeConversation.value = conversation;
}

function goToDetails(conversation) {
  if (!conversation?.id) return;
  const target = router.resolve({
    path: basePath.value,
    query: { id: String(conversation.id) }
  });
  if (typeof window !== 'undefined') {
    window.open(target.href, '_blank', 'noopener');
  }
}

watch([conversations, activeConversationId], () => {
  if (activeConversationId.value && conversations.value) {
    const updated = conversations.value.find(c => c.id === activeConversationId.value);
    if (updated) {
      activeConversation.value = updated;
    }
  }
}, { immediate: true });

function retry() {
  loadAziende();
}

function sortIndicator(key) {
  if (sortKey.value !== key) return '⇅';
  return sortDir.value === 'asc' ? '↑' : '↓';
}

function sortClass(key) {
  return sortKey.value === key ? 'sortable is-active' : 'sortable';
}

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
}

function setSort(key, direction) {
  sortKey.value = key;
  sortDir.value = direction;
}

function compareByKey(a, b, key, direction) {
  const dir = direction === 'asc' ? 1 : -1;
  const get = (item, field) => getField(item, field);

  if (key === 'date_created') {
    const aTime = a?.date_created ? new Date(a.date_created).getTime() : 0;
    const bTime = b?.date_created ? new Date(b.date_created).getTime() : 0;
    return (aTime - bTime) * dir;
  }

  if (key === 'data_prenotazione') {
    const aTime = get(a, 'data_prenotazione') ? new Date(get(a, 'data_prenotazione')).getTime() : 0;
    const bTime = get(b, 'data_prenotazione') ? new Date(get(b, 'data_prenotazione')).getTime() : 0;
    return (aTime - bTime) * dir;
  }

  if (key === 'durata_minuti') {
    const aVal = Number(get(a, 'durata_minuti') || 0);
    const bVal = Number(get(b, 'durata_minuti') || 0);
    return (aVal - bVal) * dir;
  }

  if (key === 'prenotazione_effettuata') {
    const aVal = normalizeYesNo(get(a, 'prenotazione_effettuata'));
    const bVal = normalizeYesNo(get(b, 'prenotazione_effettuata'));
    return aVal.localeCompare(bVal, 'it') * dir;
  }

  if (key === 'chiamata_spam') {
    const aVal = normalizeYesNo(get(a, 'chiamata_spam'));
    const bVal = normalizeYesNo(get(b, 'chiamata_spam'));
    return aVal.localeCompare(bVal, 'it') * dir;
  }

  if (key === 'interesse') {
    const aVal = normalizeInterest(get(a, 'interesse'));
    const bVal = normalizeInterest(get(b, 'interesse'));
    return aVal.localeCompare(bVal, 'it') * dir;
  }

  const aVal = String(get(a, key) || '').toLowerCase();
  const bVal = String(get(b, key) || '').toLowerCase();
  return aVal.localeCompare(bVal, 'it') * dir;
}


watch([tableConversations, pageSize], () => {
  page.value = 1;
});

watch(searchInput, (value) => {
  const trimmed = String(value || '');
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value);
  }
  searchDebounceTimer.value = window.setTimeout(() => {
    searchAll.value = trimmed;
  }, 250);
});

const searchDebounceTimer = ref(null);
const pageSizeMenuOpen = ref(false);
const pageSizeOptions = [20, 50, 100];
const pageSizeWrapperRef = ref(null);

function togglePageSizeMenu() {
  pageSizeMenuOpen.value = !pageSizeMenuOpen.value;
}

function setPageSize(value) {
  pageSize.value = value;
  pageSizeMenuOpen.value = false;
}

function handlePageSizeOutsideClick(event) {
  const wrapper = pageSizeWrapperRef.value;
  if (!wrapper) return;
  if (wrapper.contains(event.target)) return;
  pageSizeMenuOpen.value = false;
}

watch(
  () => ({
    search: searchAll.value,
    sortKey: sortKey.value,
    sortDir: sortDir.value,
    pageSize: pageSize.value,
    density: density.value,
    filters: filters.value
  }),
  (state) => {
    window.localStorage.setItem('conversations_table_state', JSON.stringify(state));
  },
  { deep: true }
);

onMounted(() => {
  const saved = window.localStorage.getItem('conversations_table_state');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      searchInput.value = state.search || '';
      searchAll.value = state.search || '';
      sortKey.value = state.sortKey || 'date_created';
      sortDir.value = state.sortDir || 'desc';
      pageSize.value = Number(state.pageSize) || 20;
      density.value = state.density || 'cozy';
      if (Array.isArray(state.filters)) {
        filters.value = state.filters.map(filter => ({
          id: filter.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          field: filter.field || 'nome',
          operator: filter.operator || getDefaultOperator(getFilterType(filter.field || 'nome')),
          value: filter.value || '',
          valueTo: filter.valueTo || '',
          unit: filter.unit || (filter.field === 'durata_minuti' ? 'min' : null),
          displayValue: filter.displayValue || formatDateDisplay(filter.value || ''),
          displayValueTo: filter.displayValueTo || formatDateDisplay(filter.valueTo || '')
        }));
      }
    } catch (err) {
      // ignore bad state
    }
  }
});

onMounted(() => {
  document.addEventListener('click', handlePageSizeOutsideClick);
  document.addEventListener('click', handleFilterOutsideClick);
  document.addEventListener('keydown', handleFilterKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handlePageSizeOutsideClick);
  document.removeEventListener('click', handleFilterOutsideClick);
  document.removeEventListener('keydown', handleFilterKeydown);
});

async function loadCurrentUser() {
  try {
    const response = await api.get('/users/me', { params: { fields: 'id,role.id,role.name,role.admin_access' } });
    const data = response.data?.data || response.data;
    currentUserIsAdmin.value = !!data?.role?.admin_access;
  } catch (err) {
    console.error('Errore nel caricamento utente:', err);
    currentUserIsAdmin.value = false;
  }
}

onMounted(async () => {
  await loadCurrentUser();
  await loadAziende();
  if (availableAziende.value.length > 0 && !selectedAzienda.value) {
    await handleSelectAzienda(availableAziende.value[0].value);
  } else if (selectedAzienda.value) {
    await loadConversations();
  }
});
</script>

<style scoped>
.table-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--background-page);
}

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

.table-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 14px;
  height: 100%;
  box-sizing: border-box;
}

.table-layout {
  display: flex;
  gap: 16px;
  height: 100%;
}

.table-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.table-topbar {
  display: flex;
  justify-content: flex-end;
}

.azienda-select-button {
  width: 100%;
  max-width: 260px;
  font-size: 12px;
  font-weight: 600;
  overflow: visible;
}

.azienda-select-button :deep(.v-button) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  min-height: 36px;
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: visible;
  line-height: 1.4;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
}

.azienda-button-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  letter-spacing: -0.01em;
  font-size: 12px;
  line-height: 1.4;
}

.table-searchbar {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-start;
}

.table-search {
  width: 320px;
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

.table-search:focus {
  outline: none;
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
}

.filters-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: max-content;
  min-width: 520px;
  max-width: 720px;
  max-height: 420px;
  overflow: auto;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  z-index: 20;
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
  grid-template-columns: minmax(140px, 1.1fr) minmax(140px, 1fr) minmax(220px, 1.6fr) auto;
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
  display: grid;
  gap: 6px;
}

.filter-number-group {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  align-items: center;
}

.filter-unit {
  min-width: 58px;
}

.filter-date-single {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-date-input {
  padding-right: 24px;
}

.filter-date-hidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}

.filter-date-button {
  position: absolute;
  right: 4px;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--foreground-subdued, #6b7280);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.filter-remove {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  color: var(--foreground-subdued, #6b7280);
}

.filter-remove:hover {
  background: var(--background-subdued, #f3f4f6);
}

.filters-badge {
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(94, 114, 228, 0.15);
  color: #5e72e4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.filters-badge-inline {
  margin-left: 6px;
  padding: 0 6px;
  min-width: unset;
}

.density-toggle {
  display: inline-flex;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 10px;
  overflow: hidden;
}

.density-button {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--background, #ffffff);
  cursor: pointer;
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
}

.density-button.active {
  background: var(--background-subdued, #f3f4f6);
  color: var(--foreground, #1f2937);
}

.table-meta {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px 0 12px;
}

.page-size-wrapper {
  position: relative;
  width: 52px;
  min-width: 52px;
  max-width: 52px;
  height: 28px;
  flex: 0 0 52px;
}

.page-size-button {
  width: 52px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 0 8px;
}

.page-size-value {
  font-size: 12px;
  color: var(--foreground, #1f2937);
}

.page-size-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  min-width: 44px;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.page-size-option {
  width: 100%;
  height: 26px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--foreground, #1f2937);
  cursor: pointer;
}

.page-size-option:hover {
  background: var(--background-subdued, #f3f4f6);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding: 10px 12px 0 12px;
}

.page-controls {
  margin-left: 18px;
}

.page-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.page-button {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.page-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  min-width: 40px;
  text-align: center;
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
}

.filter-input {
  width: 140px;
}

.control-select {
  min-width: 90px;
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

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--foreground-subdued);
  font-size: 14px;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 12px;
  background: var(--background);
}

.conversations-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}

.conversations-table th,
.conversations-table td {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color-subdued, #e5e7eb);
  color: var(--foreground, #111827);
  white-space: nowrap;
  vertical-align: top;
  overflow: hidden;
  text-overflow: ellipsis;
}

.details-col {
  width: 120px;
  text-align: right;
}

.conversations-table th {
  position: sticky;
  top: 0;
  background: #ffffff;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--foreground-subdued, #6b7280);
  z-index: 2;
  overflow: visible;
  cursor: grab;
}

.conversations-table th.is-dragging {
  opacity: 0.6;
}

.preview-cell {
  white-space: normal;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.details-button :deep(.v-button) {
  background: #ede9fe;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
  font-size: 11px;
  min-height: 28px;
  padding: 6px 10px;
}

.details-button :deep(.v-button:hover) {
  background: #e9d5ff;
}

.conversations-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.th-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sort-indicator {
  font-size: 11px;
  color: var(--foreground-subdued, #6b7280);
}

.column-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  z-index: 5;
  animation: slideDown 0.15s ease-out;
}

.menu-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.menu-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.menu-input {
  width: 100%;
}

.menu-select {
  width: 100%;
}

.icon-button {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.icon-button:hover {
  background: var(--background-subdued, #f9fafb);
}

.conversations-table.density-compact th,
.conversations-table.density-compact td {
  padding: 8px 12px;
}

.conversations-table.density-cozy th,
.conversations-table.density-cozy td {
  padding: 12px 16px;
}

.conversations-table.density-comfortable th,
.conversations-table.density-comfortable td {
  padding: 16px 20px;
}

.conversations-table tr:nth-child(even) {
  background: rgba(0, 0, 0, 0.02);
}

.conversations-table tr.active {
  background: var(--background-subdued, #f9fafb);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
