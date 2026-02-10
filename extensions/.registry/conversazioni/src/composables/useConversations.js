import { ref, computed } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { getFieldNames, getField, normalizeYesNo } from '../utils/conversationUtils';

const COLLECTION_NAME = 'Chiamate';

export function useConversations(selectedAzienda, aziendaField, filtersRef = null) {
  const api = useApi();
  const conversations = ref([]);
  const loadingConversations = ref(false);
  const error = ref(null);
  const searchText = ref('');
  const sortOption = ref('date_desc');
  const filters = filtersRef || ref([]);

  const fieldNames = computed(() => getFieldNames(aziendaField.value));

  async function loadConversations() {
    loadingConversations.value = true;
    error.value = null;
    try {
      const fields = fieldNames.value;
      const azienda = fields.azienda;
      const fieldList = [
        'id',
        fields.nome,
        fields.telefono,
        fields.email,
        fields.interesse,
        fields.prenotazione_effettuata,
        fields.data_prenotazione,
        fields.codice_riferimento,
        fields.link_immobile_prenotato,
        fields.info_immobile,
        fields.chiamata_spam,
        fields.trascrizione,
        fields.riassunto,
        `${fields.audio_file}.id`,
        `${fields.audio_file}.filename_download`,
        fields.durata_minuti,
        fields.date_created,
        azienda
      ];
      if (fields.tag) {
        fieldList.push(fields.tag);
      }
      if (fields.note_aggiuntive) {
        fieldList.push(fields.note_aggiuntive);
      }
      if (fields.tags) {
        fieldList.push(
          `${fields.tags}.id`,
          `${fields.tags}.tags_id.id`,
          `${fields.tags}.tags_id.nome`,
          `${fields.tags}.tags_id.colore`,
          `${fields.tags}.tags_id.is_global`
        );
      }
      const params = {
        fields: fieldList.join(','),
        sort: '-date_created',
        limit: -1
      };

      if (selectedAzienda.value) {
        params.filter = {
          [azienda]: { _eq: selectedAzienda.value }
        };
      }

      const response = await api.get(`/items/${COLLECTION_NAME}`, { params });
      conversations.value = response.data?.data || response.data || [];

      if (conversations.value.length === 0 && selectedAzienda.value) {
        console.info(`Nessun record trovato per l'azienda: ${selectedAzienda.value}`);
      }
    } catch (err) {
      console.error('Errore nel caricamento dei contatti:', err);
      console.error('Dettaglio errore Directus:', err.response?.data);
      const status = err.response?.status;
      if (status === 403) {
        error.value = 'Accesso negato alla collection Chiamate. Verifica i permessi.';
      } else if (status === 404) {
        error.value = 'Collection "Chiamate" non trovata. Verifica che la collection esista.';
      } else if (status === 400) {
        error.value = 'Errore nel filtro per azienda. Verifica che il campo "azienda" esista nella collection.';
      } else {
        error.value = `Errore nel caricamento: ${err.message || 'Errore sconosciuto'}`;
      }
      conversations.value = [];
    } finally {
      loadingConversations.value = false;
    }
  }

  const filterColumns = [
    { value: 'nome', type: 'text' },
    { value: 'durata_minuti', type: 'number' },
    { value: 'tag', type: 'text' },
    { value: 'interesse', type: 'select' },
    { value: 'prenotazione_effettuata', type: 'select' },
    { value: 'data_prenotazione', type: 'date' },
    { value: 'date_created', type: 'date' }
  ];

  const filterOperators = {
    text: ['contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
    number: ['equals', 'not_equals', 'gt', 'lt', 'between', 'is_empty', 'is_not_empty'],
    select: ['is', 'is_not', 'is_empty', 'is_not_empty'],
    date: ['is', 'is_not', 'before', 'after', 'between', 'is_empty', 'is_not_empty']
  };

  function getFilterType(field) {
    return filterColumns.find(column => column.value === field)?.type || 'text';
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
    const rawValue = getField(item, filter.field, fieldNames.value);

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

  const visibleConversations = computed(() => {
    const search = searchText.value.trim().toLowerCase();
    let filtered = Array.isArray(conversations.value) ? [...conversations.value] : [];

    // Search filter
    if (search) {
      filtered = filtered.filter(conv => {
        const nome = String(getField(conv, 'nome', fieldNames.value) || '').toLowerCase();
        const telefono = String(getField(conv, 'telefono', fieldNames.value) || '').toLowerCase();
        const interesse = String(getField(conv, 'interesse', fieldNames.value) || '').toLowerCase();
        return nome.includes(search) || telefono.includes(search) || interesse.includes(search);
      });
    }

    const activeFilters = (filters.value || []).filter(isFilterActive);
    if (activeFilters.length > 0) {
      filtered = filtered.filter(item => activeFilters.every(filter => matchesFilter(item, filter)));
    }

    // Sort
    const dateCompare = (a, b) => {
      const aTime = a?.date_created ? new Date(a.date_created).getTime() : 0;
      const bTime = b?.date_created ? new Date(b.date_created).getTime() : 0;
      return aTime - bTime;
    };
    const nameCompare = (a, b) => {
      const aName = String(getField(a, 'nome', fieldNames.value) || '').toLowerCase();
      const bName = String(getField(b, 'nome', fieldNames.value) || '').toLowerCase();
      return aName.localeCompare(bName, 'it');
    };

    switch (sortOption.value) {
      case 'date_asc':
        filtered.sort(dateCompare);
        break;
      case 'date_desc':
        filtered.sort((a, b) => dateCompare(b, a));
        break;
      case 'name_desc':
        filtered.sort((a, b) => nameCompare(b, a));
        break;
      default:
        filtered.sort(nameCompare);
    }

    return filtered;
  });

  return {
    conversations,
    loadingConversations,
    error,
    searchText,
    sortOption,
    filters,
    visibleConversations,
    fieldNames,
    loadConversations
  };
}
