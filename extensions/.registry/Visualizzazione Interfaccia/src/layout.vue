<template>
  <private-view>
    <div class="conversations-dashboard">
      <!-- Messaggio di errore globale -->
      <div v-if="error" class="error-message">
        <h3>Errore</h3>
        <p>{{ error }}</p>
        <button @click="retry" class="retry-button">Riprova</button>
      </div>

      <!-- Layout principale a 3 colonne -->
      <template v-else>
      <!-- Colonna Sinistra: Lista Items -->
      <div class="conversations-sidebar">
        <div class="sidebar-header">
          <h2>{{ collectionName }}</h2>
          <div class="sidebar-controls">
            <input
              v-model="searchText"
              class="control-input"
              type="text"
              placeholder="Cerca..."
            />

            <div class="control-row">
              <select v-model="bookingFilter" class="control-select">
                <option value="ALL">Prenotazione: Tutti</option>
                <option value="SI">Prenotazione: SI</option>
                <option value="NO">Prenotazione: NO</option>
              </select>

              <select v-model="interestFilter" class="control-select">
                <option value="ALL">Interesse: Tutti</option>
                <option value="POSITIVO">Interesse: Positivo</option>
                <option value="NEGATIVO">Interesse: Negativo</option>
              </select>
            </div>

            <select v-model="sortOption" class="control-select">
              <option value="date_desc">Ordina: Più recenti</option>
              <option value="date_asc">Ordina: Meno recenti</option>
              <option value="name_asc">Ordina: Nome (A → Z)</option>
              <option value="name_desc">Ordina: Nome (Z → A)</option>
            </select>
          </div>
        </div>
        <div class="conversations-list">
          <div v-if="loading" class="loading">
            Caricamento...
          </div>
          <div v-else-if="visibleItems.length === 0" class="empty-state">
            Nessun elemento trovato
          </div>
          <div
            v-else
            v-for="item in visibleItems"
            :key="item.id"
            class="conversation-item"
            :class="{ active: activeItemId === item.id }"
            @click="selectItem(item)"
          >
            <div class="conversation-avatar">
              {{ getInitials(getItemName(item)) }}
            </div>
            <div class="conversation-content">
              <div class="conversation-header">
                <span class="conversation-name">{{ getItemName(item) }}</span>
                <span class="conversation-date">{{ formatTime(item.date_created) }}</span>
              </div>
              <div class="conversation-preview">
                {{ getPreviewText(item) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Colonna Centro: Chat -->
      <div class="chat-container">
        <div v-if="!activeItemId" class="no-conversation-selected">
          <p>Seleziona un elemento per vedere i dettagli</p>
        </div>
        <div v-else class="chat-wrapper">
          <div class="chat-header">
            <h3>{{ getItemName(activeItem) || 'Elemento' }}</h3>
          </div>
          <div class="messages-area" ref="messagesArea">
            <!-- Riassunto (sezione separata) -->
            <div v-if="activeItem?.riassunto" class="summary-section">
              <div class="section-label">Riassunto</div>
              <div class="summary-content">{{ activeItem.riassunto }}</div>
            </div>

            <!-- Trascrizione con effetto conversazione -->
            <div v-if="parsedMessages.length > 0" class="conversation-messages">
              <div
                v-for="(msg, index) in parsedMessages"
                :key="index"
                class="message-block"
                :class="msg.type === 'ai' ? 'ai-message' : 'user-message'"
              >
                <div class="message-content-wrapper">
                  <div class="message-bubble" :class="msg.type === 'ai' ? 'ai-bubble' : 'user-bubble'">
                    <div class="message-text">{{ msg.text }}</div>
                  </div>
                  <div class="message-footer" :class="msg.type === 'ai' ? 'ai-footer' : 'user-footer'">
                    <span class="message-time">{{ msg.time || formatTime(activeItem.date_created) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Trascrizione raw (se non parsabile) -->
            <div v-else-if="activeItem?.trascrizione" class="transcription-wrapper">
              <div class="message-label">Trascrizione</div>
              <div class="transcription-content">{{ activeItem.trascrizione }}</div>
            </div>

            <!-- Messaggi correlati (da collection messages) -->
            <div v-if="relatedMessages.length > 0" class="notes-section">
              <div class="message-label">Messaggi</div>
              <div class="messages-list">
                <div
                  v-for="(msg, index) in relatedMessages"
                  :key="index"
                  class="message-block"
                  :class="getMessageType(msg) === 'ai' ? 'ai-message' : 'user-message'"
                >
                  <div class="message-content-wrapper">
                    <div class="message-bubble" :class="getMessageType(msg) === 'ai' ? 'ai-bubble' : 'user-bubble'">
                      <div class="message-text">{{ getMessageContent(msg) }}</div>
                    </div>
                    <div class="message-footer" :class="getMessageType(msg) === 'ai' ? 'ai-footer' : 'user-footer'">
                      <span class="message-time">{{ formatTime(msg.created_at || msg.date_created) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Note Aggiuntive -->
            <div v-if="parsedNotes.length > 0" class="notes-section">
              <div class="message-label">Note Aggiuntive</div>
              <div class="messages-list">
                <div
                  v-for="(note, index) in parsedNotes"
                  :key="index"
                  class="message-block ai-message"
                >
                  <div class="message-content-wrapper">
                    <div class="message-bubble ai-bubble">
                      <div class="message-text">{{ note }}</div>
                    </div>
                    <div class="message-footer ai-footer">
                      <span class="message-time">{{ formatTime(activeItem.date_created) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Stato vuoto -->
            <div v-if="parsedMessages.length === 0 && !activeItem?.trascrizione && !activeItem?.riassunto && parsedNotes.length === 0 && relatedMessages.length === 0" class="empty-state">
              Nessun contenuto disponibile
            </div>
          </div>
          <div class="chat-input-area">
            <textarea
              v-model="newMessage"
              placeholder="Aggiungi una nota..."
              class="message-input"
              @keydown="handleKeydown"
              rows="3"
            ></textarea>
            <button
              @click="sendMessage"
              :disabled="!newMessage.trim() || sendingMessage"
              class="send-button"
            >
              {{ sendingMessage ? 'Invio...' : 'Aggiungi' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Colonna Destra: Dettagli -->
      <div class="details-sidebar">
        <div class="details-header">
          <h2>Dettagli</h2>
        </div>
        <div v-if="!activeItem" class="no-details">
          <p>Seleziona un elemento per vedere i dettagli</p>
        </div>
        <div v-else class="customer-details">
          <div class="detail-item">
            <label>Nome:</label>
            <span>{{ getItemName(activeItem) || 'N/A' }}</span>
          </div>
          <div v-if="activeItem.telefono" class="detail-item">
            <label>Telefono:</label>
            <span>{{ activeItem.telefono || 'N/A' }}</span>
          </div>
          <div v-if="activeItem.interesse" class="detail-item">
            <label>Interesse:</label>
            <span>{{ activeItem.interesse || 'N/A' }}</span>
          </div>
          <div v-if="activeItem.prenotazione_effettuata !== undefined" class="detail-item">
            <label>Prenotazione Effettuata:</label>
            <span
              v-if="normalizeYesNo(activeItem.prenotazione_effettuata) === 'SI'"
              class="status-badge booked"
            >
              Prenotato
            </span>
            <span
              v-else-if="normalizeYesNo(activeItem.prenotazione_effettuata) === 'NO'"
              class="status-badge not-booked"
            >
              Non ha prenotato
            </span>
            <span v-else class="status-badge unknown">N/D</span>
          </div>
          <div v-if="activeItem.data_prenotazione" class="detail-item">
            <label>Data Prenotazione:</label>
            <span>{{ formatDate(activeItem.data_prenotazione) }}</span>
          </div>
          <div v-if="activeItem.durata_minuti" class="detail-item">
            <label>Durata:</label>
            <span>{{ formatDuration(activeItem.durata_minuti) }}</span>
          </div>
          <div v-if="audioSrc" class="detail-item">
            <label>Audio:</label>
            <audio class="audio-player" :src="audioSrc" controls preload="metadata"></audio>
          </div>
          <div class="detail-item">
            <label>Data Creazione:</label>
            <span>{{ formatDate(activeItem.date_created) }}</span>
          </div>
          <div class="detail-item">
            <label>ID:</label>
            <span class="conversation-id">{{ activeItem.id }}</span>
          </div>
        </div>
      </div>
      </template>
    </div>
  </private-view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const props = defineProps({
  collection: { type: String, required: true },
  filter: { type: Object, default: null },
  search: { type: String, default: null },
  layoutQuery: { type: Object, default: () => ({}) },
});

const api = useApi();

const activeItemId = ref(null);
const activeItem = ref(null);
const newMessage = ref('');
const sendingMessage = ref(false);
const messagesArea = ref(null);
const error = ref(null);
const relatedMessages = ref([]);
const loadingMessages = ref(false);
const items = ref([]);
const loading = ref(false);

// Nome della collection (formattato)
const collectionName = computed(() => {
  return props.collection?.replace(/_/g, ' ') || 'Items';
});

const normalizeYesNo = (value) => String(value ?? '').trim().toUpperCase();
const normalizeInterest = (value) => String(value ?? '').trim().toUpperCase();

// Estrae il nome da un item (cerca vari campi possibili)
const getItemName = (item) => {
  if (!item) return '';
  return item.nome || item.name || item.title || item.id || 'Senza nome';
};

// Filtri + ordinamento locali (oltre a quelli di Directus)
const searchText = ref('');
const bookingFilter = ref('ALL');
const interestFilter = ref('ALL');
const sortOption = ref('date_desc');

// Parametri per il fetch
const params = computed(() => ({
  ...props.layoutQuery,
  fields: '*', // Carica tutti i campi
  filter: props.filter ?? undefined,
  search: props.search ?? undefined,
}));

// Funzione per caricare gli items
async function loadItems() {
  if (!props.collection) return;
  
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get(`/items/${props.collection}`, { params: params.value });
    items.value = res.data?.data ?? [];
  } catch (e) {
    error.value = `Errore: ${e.response?.status ?? ''} ${e.message ?? ''}`;
    items.value = [];
  } finally {
    loading.value = false;
  }
}

// Carica gli items quando cambiano i parametri o la collection
watch([params, () => props.collection], loadItems, { deep: true, immediate: true });

// Items visibili con filtri locali applicati
const visibleItems = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  const bf = bookingFilter.value;
  const intf = interestFilter.value;

  let rows = Array.isArray(items.value) ? [...items.value] : [];

  // filtro prenotazione
  if (bf === 'SI' || bf === 'NO') {
    rows = rows.filter((r) => normalizeYesNo(r?.prenotazione_effettuata) === bf);
  }

  // filtro interesse
  if (intf === 'POSITIVO' || intf === 'NEGATIVO') {
    rows = rows.filter((r) => normalizeInterest(r?.interesse) === intf);
  }

  // ricerca testo
  if (q) {
    rows = rows.filter((r) => {
      const nome = String(getItemName(r) ?? '').toLowerCase();
      const tel = String(r?.telefono ?? '').toLowerCase();
      const interesse = String(r?.interesse ?? '').toLowerCase();
      return nome.includes(q) || tel.includes(q) || interesse.includes(q);
    });
  }

  // ordinamento
  const byDate = (a, b) => {
    const da = a?.date_created ? new Date(a.date_created).getTime() : 0;
    const db = b?.date_created ? new Date(b.date_created).getTime() : 0;
    return da - db;
  };
  const byName = (a, b) => {
    const na = String(getItemName(a) ?? '').toLowerCase();
    const nb = String(getItemName(b) ?? '').toLowerCase();
    return na.localeCompare(nb, 'it');
  };

  switch (sortOption.value) {
    case 'date_asc':
      rows.sort(byDate);
      break;
    case 'date_desc':
      rows.sort((a, b) => byDate(b, a));
      break;
    case 'name_desc':
      rows.sort((a, b) => byName(b, a));
      break;
    case 'name_asc':
    default:
      rows.sort(byName);
      break;
  }

  return rows;
});

    // Parsa le note aggiuntive
    const parsedNotes = computed(() => {
      if (!activeItem.value?.note_aggiuntive) return [];
      const notes = activeItem.value.note_aggiuntive
        .split(/\n+/)
        .map(note => note.trim())
        .filter(note => note.length > 0);
      return notes;
    });

    // Audio source
    const audioSrc = computed(() => {
      let v = activeItem.value?.audio_file;
      if (!v) return '';

      if (Array.isArray(v) && v.length > 0) {
        v = v[0];
      }

      const fileId =
        typeof v === 'string'
          ? v
          : v?.id ?? v?.file ?? (typeof v?.file === 'object' ? v.file.id : '');

      if (!fileId) return '';
      return `/assets/${fileId}`;
    });

    // Parsa la trascrizione per distinguere messaggi cliente/AI
    const parsedMessages = computed(() => {
      const trascrizione = activeItem.value?.trascrizione;
      if (!trascrizione) return [];

      const messages = [];
      const lines = trascrizione.split(/\n+/).filter(line => line.trim());

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const userPattern = /^(cliente|utente|user|👤)[:\-]?\s*(.+)$/i;
        const aiPattern = /^(ai|assistente|🤖|keplero|bot)[:\-]?\s*(.+)$/i;

        const userMatch = trimmed.match(userPattern);
        const aiMatch = trimmed.match(aiPattern);

        if (userMatch) {
          messages.push({
            type: 'user',
            text: userMatch[2] || userMatch[1],
            time: null
          });
        } else if (aiMatch) {
          messages.push({
            type: 'ai',
            text: aiMatch[2] || aiMatch[1],
            time: null
          });
        } else {
          if (messages.length > 0) {
            const lastType = messages[messages.length - 1].type;
            messages.push({
              type: lastType === 'user' ? 'ai' : 'user',
              text: trimmed,
              time: null
            });
          } else {
            messages.push({
              type: 'user',
              text: trimmed,
              time: null
            });
          }
        }
      }

      return messages;
    });

    // Carica i messaggi correlati dalla collection "messages"
    const loadRelatedMessages = async (itemId) => {
      if (!itemId) return;
      
      loadingMessages.value = true;
      try {
        // Cerca una collection "messages" e filtra per conversation_id o item_id
        const response = await api.get('/items/messages', {
          params: {
            filter: {
              _or: [
                { conversation_id: { _eq: itemId } },
                { item_id: { _eq: itemId } },
                { [props.collection + '_id']: { _eq: itemId } }
              ]
            },
            fields: 'id,content,text,message,role,type,created_at,date_created',
            sort: 'created_at'
          }
        });
        relatedMessages.value = response.data?.data || response.data || [];
        
        await nextTick();
        scrollToBottom();
      } catch (err) {
        console.error('Errore nel caricamento dei messaggi:', err);
        // Se la collection messages non esiste, ignora l'errore
        relatedMessages.value = [];
      } finally {
        loadingMessages.value = false;
      }
    };

    // Determina il tipo di messaggio
    const getMessageType = (msg) => {
      const role = msg.role || msg.type || 'user';
      if (role === 'agent' || role === 'ai' || role === 'assistant') {
        return 'ai';
      }
      return 'user';
    };

    // Estrae il contenuto del messaggio
    const getMessageContent = (msg) => {
      return msg.content || msg.text || msg.message || '';
    };

    // Seleziona un item
    const selectItem = async (item) => {
      activeItemId.value = item.id;
      activeItem.value = item;
      newMessage.value = '';
      await loadRelatedMessages(item.id);
    };

    // Gestisce i tasti nella textarea
    const handleKeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    };

    // Aggiunge una nota o un messaggio
    const sendMessage = async () => {
      if (!newMessage.value.trim() || !activeItemId.value || sendingMessage.value) {
        return;
      }

      const messageText = newMessage.value.trim();
      sendingMessage.value = true;

      try {
        // Prova prima ad aggiungere a note_aggiuntive
        if (activeItem.value.note_aggiuntive !== undefined) {
          const currentNotes = activeItem.value.note_aggiuntive || '';
          const updatedNotes = currentNotes 
            ? `${currentNotes}\n\n${messageText}` 
            : messageText;

          await api.patch(`/items/${props.collection}/${activeItemId.value}`, {
            note_aggiuntive: updatedNotes
          });

          activeItem.value.note_aggiuntive = updatedNotes;
        } else {
          // Altrimenti prova a creare un messaggio nella collection messages
          await api.post('/items/messages', {
            conversation_id: activeItemId.value,
            content: messageText,
            role: 'user'
          });
          
          await loadRelatedMessages(activeItemId.value);
        }

        newMessage.value = '';
      } catch (err) {
        console.error('Errore nell\'invio:', err);
        error.value = `Errore nell'invio: ${err.message || 'Errore sconosciuto'}`;
      } finally {
        sendingMessage.value = false;
      }
    };

    // Scroll automatico
    const scrollToBottom = () => {
      if (messagesArea.value) {
        messagesArea.value.scrollTop = messagesArea.value.scrollHeight;
      }
    };

    // Formatta la data
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    const formatDuration = (minutesValue) => {
      const n = Number(minutesValue);
      if (!Number.isFinite(n) || n <= 0) return 'N/A';
      if (n < 1) {
        const seconds = Math.round(n * 60);
        return `${seconds}s`;
      }
      const isInt = Math.abs(n - Math.round(n)) < 1e-9;
      const shown = isInt ? String(Math.round(n)) : n.toFixed(1);
      return `${shown} min`;
    };

    // Formatta l'ora
    const formatTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Estrae le iniziali per l'avatar
    const getInitials = (name) => {
      if (!name) return '?';
      const parts = String(name).trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return String(name).substring(0, 2).toUpperCase();
    };

    // Testo di anteprima
    const getPreviewText = (item) => {
      if (item.riassunto) {
        return item.riassunto.substring(0, 60) + (item.riassunto.length > 60 ? '...' : '');
      }
      if (item.trascrizione) {
        return item.trascrizione.substring(0, 60) + (item.trascrizione.length > 60 ? '...' : '');
      }
      return 'Nessun contenuto';
    };

    // Funzione di retry
    const retry = () => {
      error.value = null;
    };

// Watch per aggiornare quando cambiano gli items
watch(items, () => {
  // Se l'item attivo esiste ancora, aggiornalo
  if (activeItemId.value && items.value) {
    const updated = items.value.find(i => i.id === activeItemId.value);
    if (updated) {
      activeItem.value = updated;
    } else {
      // Se l'item attivo non esiste più, resetta la selezione
      activeItemId.value = null;
      activeItem.value = null;
    }
  }
}, { deep: true });

// Reset quando cambia la collection
watch(() => props.collection, () => {
  activeItemId.value = null;
  activeItem.value = null;
  relatedMessages.value = [];
});
</script>

<style scoped>
.conversations-dashboard {
  display: flex;
  height: 100%;
  min-height: 100%;
  width: 100%;
  overflow: hidden;
  background: #ffffff;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Colonna Sinistra: Lista Items */
.conversations-sidebar {
  width: 320px;
  background: #ffffff;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
  background: #ffffff;
}

.sidebar-header h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  letter-spacing: -0.3px;
}

.sidebar-controls {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-row {
  display: flex;
  gap: 8px;
}

.control-input,
.control-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  background: #f8f8f8;
  color: #333333;
  outline: none;
  transition: all 0.2s ease;
}

.control-input:focus,
.control-select:focus {
  border-color: #4CAF50;
  background: #ffffff;
}

.control-select {
  min-width: 0;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  background: #ffffff;
}

.conversation-item:hover {
  background: #f8f8f8;
}

.conversation-item.active {
  background: #E8F5E9;
  border-left-color: #4CAF50;
}

.conversation-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #9C27B0;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
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
  color: #333333;
  font-size: 14px;
  letter-spacing: -0.2px;
}

.conversation-date {
  font-size: 12px;
  color: #999999;
  font-weight: 400;
}

.conversation-preview {
  font-size: 13px;
  color: #666666;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Colonna Centro: Chat */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

.no-conversation-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999999;
  font-size: 15px;
}

.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e5e5;
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  letter-spacing: -0.3px;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #ffffff;
}

/* Sezione Riassunto separata */
.summary-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e5e5;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.summary-content {
  color: #333333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
}

.message-label {
  font-size: 12px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* Effetto conversazione */
.conversation-messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
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
  border-radius: 12px;
  word-wrap: break-word;
  line-height: 1.5;
  font-size: 14px;
  color: #333333;
}

.user-bubble {
  background: #e0f0f8;
  border-bottom-left-radius: 4px;
}

.ai-bubble {
  background: #f2e7f8;
  border-bottom-right-radius: 4px;
}

.message-text {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-footer {
  margin-top: 6px;
  font-size: 12px;
  color: #999999;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-footer {
  justify-content: flex-start;
}

.ai-footer {
  justify-content: flex-end;
}

.message-time {
  font-size: 12px;
  color: #999999;
}

.transcription-wrapper {
  margin-bottom: 24px;
}

.transcription-content {
  color: #333333;
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
}

.notes-section {
  margin-bottom: 24px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-input-area {
  padding: 20px 24px;
  border-top: 1px solid #e5e5e5;
  background: #ffffff;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
  background: #f8f8f8;
  color: #333333;
}

.message-input:focus {
  border-color: #4CAF50;
  background: #ffffff;
}

.send-button {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  min-width: 80px;
}

.send-button:hover:not(:disabled) {
  background: #45a049;
}

.send-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

/* Colonna Destra: Dettagli */
.details-sidebar {
  width: 300px;
  background: #ffffff;
  border-left: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.details-header {
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
  background: #ffffff;
}

.details-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  letter-spacing: -0.2px;
}

.no-details {
  padding: 40px 20px;
  text-align: center;
  color: #999999;
  font-size: 14px;
}

.customer-details {
  padding: 20px;
  overflow-y: auto;
}

.detail-item {
  margin-bottom: 20px;
}

.detail-item label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.detail-item span {
  display: block;
  font-size: 14px;
  color: #333333;
  word-break: break-word;
  line-height: 1.5;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.booked {
  background: #4CAF50;
  color: white;
}

.status-badge.not-booked {
  background: #e53935;
  color: white;
}

.status-badge.unknown {
  background: #cccccc;
  color: #666666;
}

.conversation-id {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 11px;
  color: #999999;
}

.audio-player {
  width: 100%;
  margin-top: 4px;
}

/* Stati di caricamento e vuoto */
.loading {
  padding: 40px 20px;
  text-align: center;
  color: #999999;
  font-size: 14px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999999;
  font-size: 14px;
}

/* Animazioni */
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

/* Messaggio di errore */
.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 40px;
  text-align: center;
}

.error-message h3 {
  color: #d32f2f;
  margin-bottom: 16px;
}

.error-message p {
  color: #666;
  margin-bottom: 24px;
  max-width: 600px;
  white-space: pre-wrap;
}

.retry-button {
  padding: 12px 24px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.retry-button:hover {
  background: #1976d2;
}

/* Scrollbar personalizzata */
.conversations-list::-webkit-scrollbar,
.messages-area::-webkit-scrollbar,
.customer-details::-webkit-scrollbar {
  width: 6px;
}

.conversations-list::-webkit-scrollbar-track,
.messages-area::-webkit-scrollbar-track,
.customer-details::-webkit-scrollbar-track {
  background: transparent;
}

.conversations-list::-webkit-scrollbar-thumb,
.messages-area::-webkit-scrollbar-thumb,
.customer-details::-webkit-scrollbar-thumb {
  background: #cccccc;
  border-radius: 3px;
}

.conversations-list::-webkit-scrollbar-thumb:hover,
.messages-area::-webkit-scrollbar-thumb:hover,
.customer-details::-webkit-scrollbar-thumb:hover {
  background: #999999;
}
</style>
