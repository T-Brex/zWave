import { ref, computed } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { getFieldNames, getField, normalizeYesNo, normalizeInterest } from '../utils/conversationUtils';

const COLLECTION_NAME = 'Chiamate';

export function useConversations(selectedAzienda, aziendaField) {
  const api = useApi();
  const conversations = ref([]);
  const loadingConversations = ref(false);
  const error = ref(null);
  const searchText = ref('');
  const bookingFilter = ref('ALL');
  const interestFilter = ref('ALL');
  const sortOption = ref('date_desc');

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

  const visibleConversations = computed(() => {
    const search = searchText.value.trim().toLowerCase();
    const booking = bookingFilter.value;
    const interest = interestFilter.value;
    let filtered = Array.isArray(conversations.value) ? [...conversations.value] : [];

    // Filter by booking
    if (booking !== 'ALL') {
      filtered = filtered.filter(conv => {
        const value = normalizeYesNo(getField(conv, 'prenotazione_effettuata', fieldNames.value));
        return value === booking;
      });
    }

    // Filter by interest
    if (interest !== 'ALL') {
      filtered = filtered.filter(conv => {
        const value = normalizeInterest(getField(conv, 'interesse', fieldNames.value));
        return value === interest;
      });
    }

    // Search filter
    if (search) {
      filtered = filtered.filter(conv => {
        const nome = String(getField(conv, 'nome', fieldNames.value) || '').toLowerCase();
        const telefono = String(getField(conv, 'telefono', fieldNames.value) || '').toLowerCase();
        const interesse = String(getField(conv, 'interesse', fieldNames.value) || '').toLowerCase();
        return nome.includes(search) || telefono.includes(search) || interesse.includes(search);
      });
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
    bookingFilter,
    interestFilter,
    sortOption,
    visibleConversations,
    fieldNames,
    loadConversations
  };
}
