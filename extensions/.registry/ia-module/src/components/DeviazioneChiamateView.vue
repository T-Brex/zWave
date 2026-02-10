<template>
  <div class="deviazione-container">
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Deviazione Chiamata</h1>
      </div>
    </div>

    <!-- Azienda Info Header -->
    <div v-if="selectedAzienda" class="azienda-header">
      <v-icon name="business" />
      <span class="azienda-name">{{ selectedAzienda }}</span>
    </div>

    <!-- Numero Assegnato - Visualizzato in grande in alto -->
    <div class="numero-assegnato-section">
      <div class="numero-assegnato-label">Numero telefonico assegnato</div>
      <div class="numero-assegnato-value">
        {{ formattedNumeroAssegnato || (loading ? 'Caricamento...' : 'Nessun numero assegnato') }}
      </div>
      
      <!-- Informazioni Codici di Deviazione -->
      <div v-if="numeroAssegnato && selectedAzienda" class="codici-test-info">
        <div class="codici-test-header">
          <v-icon name="call_split" />
          <span>Codici di deviazione chiamata</span>
        </div>
        <div class="codici-test-content">
          <p class="codici-test-description">
            I seguenti codici servono per rendere operativo l'agente IA e instradare le chiamate verso il numero assegnato. Utilizzali per configurare le deviazioni secondo le necessità operative.
          </p>
          <div class="codici-prefissi-notice">
            <v-icon name="warning" class="codici-prefissi-notice-icon" />
            <span class="codici-prefissi-notice-text">Questi sono i prefissi che funzionano più di frequente, ma per il tuo operatore potrebbe essere diverso.</span>
          </div>
          <div class="codici-list">
            <div class="codice-item">
              <code class="codice-value">*21*{{ numeroSenzaPrefisso }}#</code>
              <span class="codice-label">Attiva deviazione per tutte le chiamate</span>
            </div>
            <div class="codice-item">
              <code class="codice-value">*61*{{ numeroSenzaPrefisso }}#</code>
              <span class="codice-label">Attiva deviazione in caso di mancata risposta</span>
            </div>
            <div class="codice-item">
              <code class="codice-value">*62*{{ numeroSenzaPrefisso }}#</code>
              <span class="codice-label">Attiva deviazione se numero non raggiungibile</span>
            </div>
            <div class="codice-item">
              <code class="codice-value">*67*{{ numeroSenzaPrefisso }}#</code>
              <span class="codice-label">Attiva deviazione se linea occupata</span>
            </div>
            <div class="codice-item codice-disattiva">
              <code class="codice-value">##002#</code>
              <span class="codice-label">Disattiva tutte le deviazioni</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && selectedAzienda" class="loading-container">
      <v-progress-circular indeterminate />
      <span>Caricamento dati...</span>
    </div>

    <!-- No Azienda Selected -->
    <v-info
      v-else-if="!selectedAzienda"
      icon="info"
      title="Seleziona un'azienda"
      text="Scegli un'azienda dal selettore in alto a destra per visualizzare e modificare i dati della deviazione chiamata."
    />

    <!-- Error State -->
    <v-info
      v-else-if="error"
      type="danger"
      icon="error"
      :title="error.title || 'Errore'"
      :text="error.message || 'Si è verificato un errore durante il caricamento dei dati'"
    >
      <template #append>
        <v-button @click="loadData" :loading="loading">Riprova</v-button>
      </template>
    </v-info>

    <!-- Main Content -->
    <div v-else-if="selectedAzienda && !loading" class="form-container">
      <!-- Success Message (shown in list view) -->
      <v-info
        v-if="saveSuccess && editingConfigIndex === null"
        type="success"
        icon="check_circle"
        title="Salvataggio completato"
        text="Le modifiche sono state salvate con successo"
      />

      <!-- Lista Configurazioni o Form di Modifica -->
      <div v-if="editingConfigIndex === null" class="configs-list-container">
        <div class="configs-list-header">
          <div class="section-title">
            <v-icon name="smart_toy" />
            <span>Configurazioni trasferimento chiamate IA</span>
          </div>
          <v-button
            large
            type="primary"
            @click="addNewConfig"
          >
            <v-icon name="add" left />
            Aggiungi configurazione
          </v-button>
        </div>

        <!-- Lista Configurazioni -->
        <div v-if="configs.length === 0" class="empty-configs">
          <v-info
            icon="info"
            title="Nessuna configurazione"
            text="Clicca su 'Aggiungi configurazione' per creare la prima configurazione di trasferimento chiamate."
          />
        </div>

        <div v-else class="configs-grid">
          <div
            v-for="(config, index) in configs"
            :key="config.index || index"
            class="config-card"
            :class="{ 'config-active': config.stato, 'config-inactive': !config.stato }"
          >
            <div class="config-card-header">
              <div class="config-status">
                <v-icon :name="config.stato ? 'toggle_on' : 'toggle_off'" :class="{ 'status-active': config.stato, 'status-inactive': !config.stato }" />
                <span class="status-label">{{ config.stato ? 'Attiva' : 'Inattiva' }}</span>
              </div>
              <div class="config-actions">
                <v-button
                  small
                  icon
                  :type="config.stato ? 'success' : 'secondary'"
                  :disabled="saving"
                  :loading="saving && togglingConfigIndex === index"
                  @click="toggleConfigStato(index)"
                  :title="config.stato ? 'Disattiva' : 'Attiva'"
                >
                  <v-icon :name="config.stato ? 'toggle_on' : 'toggle_off'" />
                </v-button>
                <v-button
                  small
                  icon
                  secondary
                  @click="editConfig(index)"
                  title="Modifica"
                >
                  <v-icon name="edit" />
                </v-button>
                <v-button
                  small
                  icon
                  secondary
                  type="danger"
                  @click="deleteConfig(index)"
                  title="Elimina"
                >
                  <v-icon name="delete" />
                </v-button>
              </div>
            </div>
            
            <div class="config-card-content">
              <div class="config-field">
                <div class="config-field-label">
                  <v-icon name="phone" />
                  <span>Numero</span>
                </div>
                <div class="config-field-value">{{ config.numero_trasferimento || 'Non impostato' }}</div>
              </div>
              
              <div class="config-field">
                <div class="config-field-label">
                  <v-icon name="description" />
                  <span>Condizione</span>
                </div>
                <div class="config-field-value config-condizione-preview">
                  {{ config.condizione ? (config.condizione.length > 100 ? config.condizione.substring(0, 100) + '...' : config.condizione) : 'Non impostata' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Modifica/Aggiungi Configurazione -->
      <div v-else class="config-form-container">
        <div class="config-form-header">
          <div class="section-title">
            <v-icon name="smart_toy" />
            <span>{{ editingConfigIndex === 'new' ? 'Nuova configurazione' : 'Modifica configurazione' }}</span>
          </div>
          <v-button
            small
            secondary
            @click="cancelEdit"
          >
            <v-icon name="close" left />
            Annulla
          </v-button>
        </div>

        <!-- Toggle Stato nel Form -->
        <div class="form-section-toggle">
          <div class="toggle-section-label">
            <v-icon name="power_settings_new" />
            <span>Stato trasferimento</span>
          </div>
          <div class="toggle-section-control">
            <v-icon :name="stato ? 'toggle_on' : 'toggle_off'" :class="{ 'toggle-active': stato, 'toggle-inactive': !stato }" />
            <span class="toggle-label">{{ stato ? 'Attivo' : 'Inattivo' }}</span>
            <v-button
              small
              :type="stato ? 'success' : 'secondary'"
              :disabled="saving"
              @click="toggleStatoInForm"
              class="toggle-btn"
            >
              <v-icon :name="stato ? 'check_circle' : 'cancel'" left />
              {{ stato ? 'Disattiva' : 'Attiva' }}
            </v-button>
          </div>
        </div>

      <!-- Condizione Field - Riquadro grande -->
      <div class="form-field form-field-large">
        <div class="field-label-with-action">
          <div class="field-label">
            <v-icon name="description" />
            <span>Condizione di trasferimento</span>
          </div>
          <v-button
            small
            secondary
            :disabled="saving"
            @click="insertDefaultCondition"
            class="default-text-btn"
          >
            <v-icon name="auto_fix_high" left />
            Inserisci testo predefinito
          </v-button>
        </div>
        <v-textarea
          v-model="condizione"
          placeholder="Definisci le condizioni per il trasferimento delle chiamate all'agente IA..."
          rows="8"
          :disabled="saving"
          :loading="saving"
          :class="{ 'field-error-state': condizioneError }"
          @keydown="handleKeydownCondizione"
          @keyup="handleKeyupCondizione"
          @input="handleInputCondizione"
        />
        <div class="field-help">
          Specifica le condizioni che determinano quando l'agente IA deve gestire la chiamata.
        </div>
        <div v-if="condizioneError" class="field-error">
          <v-icon name="error" />
          {{ condizioneError }}
        </div>
      </div>

      <!-- Numero Trasferimento Field - Riquadro più piccolo -->
      <div class="form-field form-field-small">
        <div class="field-label">
          <v-icon name="phone" />
          <span>Numero di trasferimento</span>
        </div>
        <div class="input-with-prefix" :class="{ 'field-error-state': numeroTrasferimentoError }">
          <span class="input-prefix">+39</span>
          <v-input
            v-model="numeroTrasferimentoDisplay"
            placeholder="es. 3331234567"
            type="text"
            :disabled="saving"
            :loading="saving"
            class="input-with-prefix-input"
            @keydown="handleKeydownNumero"
            @keyup="handleKeyupNumero"
            @input="handleInputNumero"
          />
        </div>
        <div class="field-help">
          Numero telefonico verso cui l'agente IA instrada le chiamate quando le condizioni sono soddisfatte. Il prefisso +39 viene aggiunto automaticamente.
        </div>
        <div v-if="numeroTrasferimentoError" class="field-error">
          <v-icon name="error" />
          {{ numeroTrasferimentoError }}
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-container">
        <v-button
          large
          :loading="saving"
          :disabled="!hasChanges || saving || hasValidationErrors"
          @click="saveData"
        >
          <v-icon name="check" left />
          Salva modifiche
        </v-button>
        <v-button
          large
          secondary
          :disabled="!hasChanges || saving"
          @click="resetForm"
        >
          <v-icon name="refresh" left />
          Annulla modifiche
        </v-button>
      </div>

      <!-- Success Message -->
      <v-info
        v-if="saveSuccess"
        type="success"
        icon="check_circle"
        title="Salvataggio completato"
        text="Le modifiche sono state salvate con successo"
      />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { injectAzienda } from '../composables/useAzienda';

const api = useApi();
const { selectedAzienda } = injectAzienda();

// Collection name
const COLLECTION_DEVIAZIONE = 'deviazione_chiamata';

// Deviazione data state
const loading = ref(false);
const saving = ref(false);
const error = ref(null);
const saveSuccess = ref(false);

const numeroAssegnato = ref('');

// Configurations array - multiple configs per azienda
const configs = ref([]); // Array of { index, condizione, numero_trasferimento, stato } (index is 1, 2, 3, etc.)

// Current record ID for the azienda (single record with dynamic fields)
const currentRecordId = ref(null);

// Current editing config (index in configs array, or 'new' for new config)
const editingConfigIndex = ref(null);

// Form values for current editing
const condizione = ref('');
const numeroTrasferimento = ref('');
const stato = ref(false);

// Store original values for comparison
const originalCondizione = ref('');
const originalNumeroTrasferimento = ref('');
const originalStato = ref(false);

const condizioneError = ref('');
const numeroTrasferimentoError = ref('');

// Track which config is being toggled
const togglingConfigIndex = ref(null);

// Extract number without prefix for codes
const numeroSenzaPrefisso = computed(() => {
  if (!numeroAssegnato.value) return '';
  
  // Remove all non-numeric characters
  let cleaned = numeroAssegnato.value.replace(/[^\d]/g, '');
  
  // Remove leading 39 if present
  if (cleaned.startsWith('39') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  return cleaned;
});

// Display number without +39 prefix for input
const numeroTrasferimentoDisplay = computed({
  get() {
    if (!numeroTrasferimento.value) return '';
    // Remove only +39 prefix if present, but keep numbers starting with 39 (like 3925894989)
    let num = numeroTrasferimento.value;
    // Remove +39 prefix if present
    if (num.startsWith('+39')) {
      num = num.substring(3).trim();
    } else if (num.startsWith('39') && num.length <= 12) {
      // Only remove 39 if it's likely a prefix (number is short, <= 12 chars including 39)
      // Numbers starting with 39 like 3925894989 should be kept as is
      // This is a heuristic: if after removing 39 we have <= 10 digits, it was likely a prefix
      const without39 = num.substring(2).replace(/[^\d]/g, '');
      if (without39.length <= 10) {
        num = without39;
      }
    }
    // Remove any non-numeric characters except spaces
    return num.replace(/[^\d\s]/g, '');
  },
  set(value) {
    // Clean the input - keep all digits
    let cleaned = value.replace(/[^\d]/g, '');
    if (cleaned) {
      // If number starts with 39 and is long (like 3925894989), keep as is and add +
      if (cleaned.startsWith('39') && cleaned.length >= 11) {
        numeroTrasferimento.value = `+${cleaned}`;
      } else {
        // Otherwise, always add +39 prefix
        numeroTrasferimento.value = `+39${cleaned}`;
      }
    } else {
      numeroTrasferimento.value = '';
    }
  }
});

// Format phone number with Italian prefix and 4-3-4 spacing (excluding prefix)
const formattedNumeroAssegnato = computed(() => {
  if (!numeroAssegnato.value) return '';
  
  const numero = numeroSenzaPrefisso.value;
  
  if (!numero) return '';
  
  // Format as 4-3-4
  if (numero.length === 10) {
    return `+39 ${numero.substring(0, 4)} ${numero.substring(4, 7)} ${numero.substring(7)}`;
  } else if (numero.length === 9) {
    // For 9 digits: 3-3-3
    return `+39 ${numero.substring(0, 3)} ${numero.substring(3, 6)} ${numero.substring(6)}`;
  } else if (numero.length === 11) {
    // For 11 digits: 4-3-4
    return `+39 ${numero.substring(0, 4)} ${numero.substring(4, 7)} ${numero.substring(7)}`;
  }
  
  // Fallback: return with +39 prefix
  return `+39 ${numero}`;
});

// Computed - check if form has changes (works for both new and edit)
const hasChanges = computed(() => {
  // If editing a new config, any value change is a change
  if (editingConfigIndex.value === 'new') {
    return condizione.value.trim() !== '' || 
           numeroTrasferimento.value !== '' || 
           stato.value !== false;
  }
  
  // If editing existing config, compare with original values
  if (editingConfigIndex.value !== null && typeof editingConfigIndex.value === 'number') {
    return (
      condizione.value !== originalCondizione.value ||
      numeroTrasferimento.value !== originalNumeroTrasferimento.value ||
      stato.value !== originalStato.value
    );
  }
  
  return false;
});

// Validation errors
const hasValidationErrors = computed(() => {
  if (!stato.value) return false; // No validation needed if transfer is inactive
  
  const condizioneEmpty = !condizione.value || !condizione.value.trim();
  const numeroEmpty = !numeroTrasferimento.value || !numeroTrasferimento.value.replace(/[^\d]/g, '');
  
  return condizioneEmpty || numeroEmpty;
});

// Load data from collection filtered by azienda - load configurazioni JSON field
async function loadData() {
  if (!selectedAzienda.value) return;

  loading.value = true;
  error.value = null;
  condizioneError.value = '';
  numeroTrasferimentoError.value = '';
  saveSuccess.value = false;

  try {
    // Load single record for this azienda
    const response = await api.get(`/items/${COLLECTION_DEVIAZIONE}`, {
      params: {
        fields: ['id', 'numero_assegnato', 'azienda', 'configurazioni'],
        limit: 1,
        sort: ['-date_created'],
        filter: {
          azienda: {
            _eq: selectedAzienda.value,
          },
        },
      },
    });

    const items = response?.data?.data || [];
    const item = items.length > 0 ? items[0] : null;
    
    configs.value = [];
    currentRecordId.value = null;
    numeroAssegnato.value = '';
    
    if (item) {
      currentRecordId.value = item.id;
      numeroAssegnato.value = item.numero_assegnato || '';
      
      // Parse configurazioni JSON field
      let configurazioniArray = [];
      
      if (item.configurazioni) {
        // Handle both JSON string and already parsed object
        if (typeof item.configurazioni === 'string') {
          try {
            configurazioniArray = JSON.parse(item.configurazioni);
          } catch (e) {
            console.error('Error parsing configurazioni JSON:', e);
            configurazioniArray = [];
          }
        } else if (Array.isArray(item.configurazioni)) {
          configurazioniArray = item.configurazioni;
        }
      }
      
      // Process configurazioni and format numbers
      configs.value = configurazioniArray.map((config, idx) => {
        let numTrasf = config.numero_trasferimento || '';
        if (numTrasf) {
          let cleaned = numTrasf.replace(/[^\d]/g, '');
          if (cleaned) {
            if (cleaned.startsWith('39') && cleaned.length >= 11) {
              numTrasf = `+${cleaned}`;
            } else if (!numTrasf.startsWith('+')) {
              if (cleaned.startsWith('39') && cleaned.length <= 12) {
                cleaned = cleaned.substring(2);
              }
              numTrasf = cleaned ? `+39${cleaned}` : '';
            }
          } else {
            numTrasf = '';
          }
        }
        
        return {
          index: idx + 1, // 1-based index for display
          numero_trasferimento: numTrasf,
          condizione: config.condizione || '',
          stato: config.stato === true || config.stato === 1,
        };
      });
    }
    
    // Reset editing state - don't reset if currently editing
    if (editingConfigIndex.value === null) {
      resetForm();
    }
  } catch (err) {
    console.error('Error loading deviazione_chiamata:', err);
    
    const status = err?.response?.status;
    const message = err?.response?.data?.errors?.[0]?.message || err?.message || 'Errore sconosciuto';
    
    if (status === 403) {
      error.value = {
        title: 'Accesso negato',
        message: `Non hai i permessi per accedere al campo "configurazioni" nella collection "${COLLECTION_DEVIAZIONE}". Verifica che: 1) Il campo "configurazioni" (tipo JSON) esista nella collection, 2) Hai i permessi di lettura/scrittura per questo campo. Vai in Settings > Roles & Permissions per verificare i permessi.`,
      };
    } else if (status === 404) {
      error.value = {
        title: 'Collection non trovata',
        message: `La collection "${COLLECTION_DEVIAZIONE}" non esiste. Verifica che il nome della collection sia corretto.`,
      };
    } else {
      error.value = {
        title: 'Errore di caricamento',
        message: `Impossibile caricare i dati: ${message}`,
      };
    }
  } finally {
    loading.value = false;
  }
}

// Validate form
function validateForm() {
  condizioneError.value = '';
  numeroTrasferimentoError.value = '';
  
  // If transfer is active, condition and number are required
  if (stato.value) {
    const condizioneEmpty = !condizione.value || !condizione.value.trim();
    const numeroEmpty = !numeroTrasferimento.value || !numeroTrasferimento.value.replace(/[^\d]/g, '');
    
    if (condizioneEmpty) {
      condizioneError.value = 'La condizione è obbligatoria quando il trasferimento è attivo';
    }
    
    if (numeroEmpty) {
      numeroTrasferimentoError.value = 'Il numero di trasferimento è obbligatorio quando il trasferimento è attivo';
    }
    
    if (condizioneEmpty || numeroEmpty) {
      return false;
    }
  }
  
  return true;
}

// Watch stato to clear errors when deactivated
watch(stato, (newValue) => {
  if (!newValue) {
    condizioneError.value = '';
    numeroTrasferimentoError.value = '';
  } else {
    // Validate when activating
    validateForm();
  }
});

// Save data - use patch to update/add dynamic fields on single record
async function saveData() {
  if (!selectedAzienda.value) {
    error.value = {
      title: 'Nessuna azienda selezionata',
      message: 'Seleziona un\'azienda prima di salvare i dati.',
    };
    return;
  }

  if (editingConfigIndex.value === null || editingConfigIndex.value === undefined) {
    error.value = {
      title: 'Nessuna configurazione selezionata',
      message: 'Seleziona o crea una configurazione prima di salvare. Clicca su "Aggiungi configurazione" per creare una nuova configurazione.',
    };
    return;
  }

  if (!validateForm()) {
    return;
  }

  saving.value = true;
  error.value = null;
  saveSuccess.value = false;
  condizioneError.value = '';
  numeroTrasferimentoError.value = '';

  try {
    // Build new configurazioni array
    let newConfigs = [...configs.value];
    
    if (editingConfigIndex.value === 'new') {
      // Add new configuration
      newConfigs.push({
        numero_trasferimento: numeroTrasferimento.value || null,
        condizione: condizione.value || null,
        stato: stato.value,
      });
    } else {
      // Update existing configuration (array index is editingConfigIndex)
      const arrayIndex = editingConfigIndex.value;
      if (arrayIndex >= 0 && arrayIndex < newConfigs.length) {
        newConfigs[arrayIndex] = {
          numero_trasferimento: numeroTrasferimento.value || null,
          condizione: condizione.value || null,
          stato: stato.value,
        };
      }
    }

    // Prepare payload with JSON field
    const payload = {
      configurazioni: newConfigs, // Directus handles JSON serialization automatically
    };

    if (currentRecordId.value) {
      // Update existing record with new configurazioni JSON
      try {
        await api.patch(`/items/${COLLECTION_DEVIAZIONE}/${currentRecordId.value}`, payload);
      } catch (updateErr) {
        console.error('Error updating config:', updateErr);
        throw new Error(`Errore durante l'aggiornamento della configurazione: ${updateErr?.response?.data?.errors?.[0]?.message || updateErr?.message}`);
      }
    } else {
      // Create new record with configurazioni JSON field
      try {
        const createPayload = {
          numero_assegnato: numeroAssegnato.value || null,
          azienda: selectedAzienda.value,
          configurazioni: newConfigs,
        };

        const response = await api.post(`/items/${COLLECTION_DEVIAZIONE}`, createPayload);
        currentRecordId.value = response?.data?.data?.id || null;
      } catch (createErr) {
        console.error('Error creating config:', createErr);
        throw new Error(`Errore durante la creazione della configurazione: ${createErr?.response?.data?.errors?.[0]?.message || createErr?.message}`);
      }
    }

    // Show success message
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 5000);
    
    // Reload data to sync with database - this will return to list view
    await loadData();
    
    // Return to list view after successful save
    editingConfigIndex.value = null;
  } catch (err) {
    console.error('Error saving deviazione_chiamata:', err);
    
    const status = err?.response?.status;
    const message = err?.response?.data?.errors?.[0]?.message || err?.message || 'Errore sconosciuto';
    
    if (status === 403) {
      error.value = {
        title: 'Accesso negato',
        message: `Non hai i permessi per modificare il campo "configurazioni" nella collection "${COLLECTION_DEVIAZIONE}". Verifica che: 1) Il campo "configurazioni" (tipo JSON) esista nella collection, 2) Hai i permessi di lettura/scrittura per questo campo. Vai in Settings > Roles & Permissions per verificare i permessi.`,
      };
    } else if (status === 404) {
      error.value = {
        title: 'Collection non trovata',
        message: `La collection "${COLLECTION_DEVIAZIONE}" non esiste. Verifica che il nome della collection sia corretto.`,
      };
    } else {
      error.value = {
        title: 'Errore di salvataggio',
        message: `Impossibile salvare i dati: ${message}`,
      };
    }
  } finally {
    saving.value = false;
  }
}

// Insert default condition text
function insertDefaultCondition() {
  const defaultText = `Trasferisci la conversazione a un operatore umano quando appropriato.
Chiama questa funzione quando:
- Richieste dirette: "Voglio parlare con una persona", "Collegami con un rappresentante", "Trasferiscimi a un operatore"
- Limitazioni tecniche: L'utente ha bisogno di qualcosa che va oltre le tue capacità
- Problemi complessi: Questioni che richiedono il giudizio umano o l'accesso a sistemi al di fuori della tua portata

Prima di chiamare questa funzione, cerca di assistere l'utente prima se la richiesta è nelle tue capacità.

Non chiamare questa funzione quando:
- Puoi rispondere autonomamente alle richieste di informazioni di base
- Puoi completare compiti semplici entro le tue capacità
- L'utente non ha richiesto esplicitamente assistenza umana per problemi complessi

Operatori umani disponibili per il trasferimento:
[le regole di trasferimento saranno popolate in runtime]

FLUSSI DI ESEMPIO:

Esempio 1 (richiesta esplicita):
Utente: "Voglio parlare con una persona reale invece che con un'IA. Per favore collegami a un operatore umano."
Assistente: "Capisco che preferiresti parlare con un operatore umano. Sto organizzando la connessione per te ora e un rappresentante umano ti assisterà a breve."
[funzione transfer_to_number chiamata]

Esempio 2 (limitazione tecnica):
Utente: "Devo modificare il mio indirizzo di fatturazione e il metodo di pagamento per il mio ordine #12345."
Assistente: "Capisco che hai bisogno di aggiornare le tue informazioni di fatturazione. Dato che questo richiede l'accesso ai dettagli del tuo account, ti collegherò con un rappresentante umano che potrà aiutarti con questa modifica in modo sicuro."
[funzione transfer_to_number chiamata]

Esempio 3 (NON chiamare):
Utente: "Qual è la vostra politica di rimborso?"
Assistente: "La nostra politica standard di rimborso consente restituzioni entro 30 giorni dall'acquisto con ricevuta. Vorresti informazioni più specifiche su un prodotto o una situazione particolare?"`;

  condizione.value = defaultText;
  condizioneError.value = '';
}

// Add new configuration
function addNewConfig() {
  editingConfigIndex.value = 'new';
  condizione.value = '';
  numeroTrasferimento.value = '';
  stato.value = false;
  originalCondizione.value = '';
  originalNumeroTrasferimento.value = '';
  originalStato.value = false;
  condizioneError.value = '';
  numeroTrasferimentoError.value = '';
}

// Edit existing configuration
function editConfig(index) {
  const config = configs.value[index];
  editingConfigIndex.value = index;
  condizione.value = config.condizione || '';
  numeroTrasferimento.value = config.numero_trasferimento || '';
  stato.value = config.stato || false;
  originalCondizione.value = config.condizione || '';
  originalNumeroTrasferimento.value = config.numero_trasferimento || '';
  originalStato.value = config.stato || false;
  condizioneError.value = '';
  numeroTrasferimentoError.value = '';
}

// Cancel editing and return to list
function cancelEdit() {
  editingConfigIndex.value = null;
  resetForm();
}

// Toggle stato in form (without auto-save)
function toggleStatoInForm() {
  const willBeActive = !stato.value;
  if (willBeActive) {
    const condizioneEmpty = !condizione.value || !condizione.value.trim();
    const numeroEmpty = !numeroTrasferimento.value || !numeroTrasferimento.value.replace(/[^\d]/g, '');
    
    if (condizioneEmpty || numeroEmpty) {
      condizioneError.value = condizioneEmpty ? 'La condizione è obbligatoria quando il trasferimento è attivo' : '';
      numeroTrasferimentoError.value = numeroEmpty ? 'Il numero di trasferimento è obbligatorio quando il trasferimento è attivo' : '';
      return;
    }
  }
  
  condizioneError.value = '';
  numeroTrasferimentoError.value = '';
  stato.value = !stato.value;
}

// Toggle config stato directly from card
async function toggleConfigStato(index) {
  if (!selectedAzienda.value) {
    error.value = {
      title: 'Nessuna azienda selezionata',
      message: 'Seleziona un\'azienda prima di modificare lo stato.',
    };
    return;
  }

  if (index < 0 || index >= configs.value.length) {
    return;
  }

  const config = configs.value[index];
  const willBeActive = !config.stato;

  // If activating, check if required fields are filled
  if (willBeActive) {
    const condizioneEmpty = !config.condizione || !config.condizione.trim();
    const numeroEmpty = !config.numero_trasferimento || !config.numero_trasferimento.replace(/[^\d]/g, '');
    
    if (condizioneEmpty || numeroEmpty) {
      error.value = {
        title: 'Impossibile attivare',
        message: 'Per attivare la configurazione, è necessario che siano compilati sia la condizione che il numero di trasferimento.',
      };
      setTimeout(() => {
        error.value = null;
      }, 5000);
      return;
    }
  }

  togglingConfigIndex.value = index;
  saving.value = true;
  error.value = null;
  saveSuccess.value = false;

  try {
    // Build new configurazioni array with updated stato
    const newConfigs = [...configs.value];
    newConfigs[index] = {
      ...newConfigs[index],
      stato: willBeActive,
    };

    const payload = {
      configurazioni: newConfigs,
    };

    if (currentRecordId.value) {
      await api.patch(`/items/${COLLECTION_DEVIAZIONE}/${currentRecordId.value}`, payload);
    } else {
      // Create new record if it doesn't exist
      const createPayload = {
        numero_assegnato: numeroAssegnato.value || null,
        azienda: selectedAzienda.value,
        configurazioni: newConfigs,
      };

      const response = await api.post(`/items/${COLLECTION_DEVIAZIONE}`, createPayload);
      currentRecordId.value = response?.data?.data?.id || null;
    }

    // Show success message
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);

    // Reload data to sync
    await loadData();
  } catch (err) {
    console.error('Error toggling config stato:', err);
    
    const status = err?.response?.status;
    const message = err?.response?.data?.errors?.[0]?.message || err?.message || 'Errore sconosciuto';
    
    if (status === 403) {
      error.value = {
        title: 'Accesso negato',
        message: `Non hai i permessi per modificare il campo "configurazioni" nella collection "${COLLECTION_DEVIAZIONE}".`,
      };
    } else if (status === 404) {
      error.value = {
        title: 'Collection non trovata',
        message: `La collection "${COLLECTION_DEVIAZIONE}" non esiste.`,
      };
    } else {
      error.value = {
        title: 'Errore di salvataggio',
        message: `Impossibile aggiornare lo stato: ${message}`,
      };
    }
  } finally {
    saving.value = false;
    togglingConfigIndex.value = null;
  }
}

// Delete configuration - remove from configurazioni array
async function deleteConfig(index) {
  if (!currentRecordId.value || index < 0 || index >= configs.value.length) {
    return;
  }
  
  saving.value = true;
  try {
    // Remove configuration from array
    const newConfigs = configs.value.filter((_, idx) => idx !== index);
    
    const payload = {
      configurazioni: newConfigs,
    };

    await api.patch(`/items/${COLLECTION_DEVIAZIONE}/${currentRecordId.value}`, payload);
    await loadData(); // Reload to sync
  } catch (err) {
    console.error('Error deleting config:', err);
    error.value = {
      title: 'Errore di eliminazione',
      message: `Impossibile eliminare la configurazione: ${err?.response?.data?.errors?.[0]?.message || err?.message}`,
    };
  } finally {
    saving.value = false;
  }
}

// Reset form to original values or empty for new config
function resetForm() {
  if (editingConfigIndex.value === 'new') {
    // Reset to empty for new config
    condizione.value = '';
    numeroTrasferimento.value = '';
    stato.value = false;
    originalCondizione.value = '';
    originalNumeroTrasferimento.value = '';
    originalStato.value = false;
  } else if (editingConfigIndex.value !== null && typeof editingConfigIndex.value === 'number') {
    // Reset to original values for existing config
    const config = configs.value[editingConfigIndex.value];
    if (config) {
      condizione.value = config.condizione || '';
      numeroTrasferimento.value = config.numero_trasferimento || '';
      stato.value = config.stato || false;
    }
  } else {
    // Reset to empty when no config selected
    condizione.value = '';
    numeroTrasferimento.value = '';
    stato.value = false;
    originalCondizione.value = '';
    originalNumeroTrasferimento.value = '';
    originalStato.value = false;
  }
  condizioneError.value = '';
  numeroTrasferimentoError.value = '';
  saveSuccess.value = false;
  error.value = null;
}

// Gestione eventi per prevenire schermata bianca - Condizione
function handleKeydownCondizione(event) {
  // Gestione Backspace/Delete per prevenire comportamenti indesiderati
  if (event.key === 'Backspace' || event.key === 'Delete') {
    // Se il campo è vuoto o sta per diventare vuoto, previeni tutto
    const currentValue = condizione.value || '';
    if (currentValue.length === 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      // Assicura che il valore rimanga una stringa vuota
      if (condizione.value !== '') {
        condizione.value = '';
      }
      return false;
    }
    
    // Durante la ripetizione, gestisci con più controllo
    if (event.repeat) {
      // Permetti la cancellazione normale ma previeni comportamenti del browser
      event.stopPropagation();
    }
  }
  
  // Previeni comportamenti di navigazione del browser quando si tiene premuto
  if (event.key === 'Backspace' && !event.target.matches('textarea, input')) {
    event.preventDefault();
  }
}

function handleKeyupCondizione(event) {
  // Dopo il rilascio del tasto, assicura che il valore sia corretto
  if (event.key === 'Backspace' || event.key === 'Delete') {
    // Normalizza il valore
    const currentValue = condizione.value;
    if (currentValue === null || currentValue === undefined) {
      condizione.value = '';
    } else if (typeof currentValue !== 'string') {
      condizione.value = String(currentValue);
    }
    event.stopPropagation();
  }
}

function handleInputCondizione(event) {
  // Assicura che il valore sia sempre una stringa valida
  const value = event?.target?.value ?? condizione.value;
  if (value === null || value === undefined) {
    condizione.value = '';
  } else {
    condizione.value = String(value);
  }
}

// Gestione eventi per prevenire schermata bianca - Numero
function handleKeydownNumero(event) {
  // Permetti sempre la cancellazione normale - non interferire con Backspace/Delete
  // Previeni solo comportamenti di navigazione del browser quando si tiene premuto
  if (event.key === 'Backspace' && !event.target.matches('textarea, input')) {
    event.preventDefault();
  }
  
  // Non prevenire la cancellazione nel campo input - lascia che funzioni normalmente
  // Il computed si occuperà di pulire i caratteri non numerici dopo l'input
}

function handleKeyupNumero(event) {
  // Dopo il rilascio del tasto, assicura che il valore sia corretto
  // Ma solo se necessario per prevenire la schermata bianca
  if (event.key === 'Backspace' || event.key === 'Delete') {
    // Normalizza il valore solo se è null/undefined, altrimenti lascia che il computed gestisca
    const currentValue = numeroTrasferimento.value;
    if (currentValue === null || currentValue === undefined) {
      numeroTrasferimento.value = '';
    } else if (typeof currentValue !== 'string') {
      numeroTrasferimento.value = String(currentValue);
    }
    // Non fermare la propagazione per permettere la cancellazione normale
  }
}

function handleInputNumero(event) {
  // Non interferire con l'input - il computed numeroTrasferimentoDisplay
  // gestirà automaticamente la pulizia dei caratteri non numerici
  // Questo permette all'utente di cancellare normalmente, anche lettere
}

// Initialize on mount
onMounted(async () => {
  if (selectedAzienda.value) {
    await loadData();
  }
});

// Watch for azienda selection changes
watch(selectedAzienda, (newAzienda, oldAzienda) => {
  if (newAzienda === oldAzienda) return;
  editingConfigIndex.value = null;
  resetForm();
  if (newAzienda) {
    loadData();
  } else {
    configs.value = [];
    currentRecordId.value = null;
    numeroAssegnato.value = '';
    error.value = null;
  }
});

// Watch condizione and numeroTrasferimento to validate when stato is active
watch([condizione, numeroTrasferimento], () => {
  if (stato.value) {
    validateForm();
  }
});
</script>

<style scoped>
.deviazione-container {
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.azienda-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  margin-bottom: 32px;
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-normal, #e8e8e8);
}

.azienda-header :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.8;
}

.azienda-name {
  flex: 1;
  letter-spacing: -0.01em;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
  flex-wrap: wrap;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--foreground, #1a1a1a);
  margin: 0;
  letter-spacing: -0.02em;
}

.numero-assegnato-section {
  margin-bottom: 56px;
  padding: 40px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 16px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.numero-assegnato-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 20px;
  text-align: center;
}

.numero-assegnato-value {
  font-size: 52px;
  font-weight: 700;
  color: var(--foreground, #1a1a1a);
  line-height: 1.2;
  word-break: break-all;
  text-align: center;
  letter-spacing: 2px;
  margin-bottom: 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.codici-test-info {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--border-normal, #e8e8e8);
}

.codici-test-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

.codici-test-header :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.8;
}

.codici-test-description {
  color: var(--foreground-subdued, #6b7280);
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 24px;
  letter-spacing: -0.01em;
}

.codici-prefissi-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  margin-bottom: 24px;
  background: #fff3cd;
  border-radius: 10px;
  border: 1px solid #e6d68a;
}

.codici-prefissi-notice-icon {
  flex-shrink: 0;
  color: #856404;
  margin-top: 2px;
}

.codici-prefissi-notice-text {
  font-size: 14px;
  line-height: 1.6;
  color: #856404;
  letter-spacing: -0.01em;
}

.codici-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.codice-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid var(--border-normal, #e8e8e8);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.codice-item:hover {
  border-color: var(--border-normal, #d1d5db);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.codice-item.codice-disattiva {
  border-color: var(--danger-background, #fee2e2);
  background: linear-gradient(135deg, var(--danger-background, #fef2f2) 0%, var(--background-page, #ffffff) 100%);
}

.codice-item.codice-disattiva:hover {
  border-color: var(--danger, #e54848);
  box-shadow: 0 4px 12px rgba(229, 72, 72, 0.12);
}

.codice-value {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  background: var(--background-subdued, #f9fafb);
  padding: 8px 14px;
  border-radius: 6px;
  display: inline-block;
  width: fit-content;
  border: 1px solid var(--border-normal, #e5e7eb);
  letter-spacing: 0.5px;
}

.codice-item.codice-disattiva .codice-value {
  color: var(--danger, #e54848);
  background: var(--background-page, #ffffff);
  border-color: var(--danger-background, #fee2e2);
}

.codice-label {
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.6;
  letter-spacing: -0.01em;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px 24px;
  color: var(--foreground-subdued, #666);
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field-large {
  width: 100%;
}

.form-field-small {
  width: 100%;
  max-width: 600px;
}

.field-label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.01em;
  flex: 1;
}

.field-label :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.8;
}

.default-text-btn {
  flex-shrink: 0;
}

.default-text-btn :deep(.v-button) {
  font-size: 13px;
  padding: 8px 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.section-title :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.8;
}

.toggle-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  min-width: 60px;
}

.toggle-btn {
  min-width: 120px;
}

.field-help {
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.6;
  margin-top: 4px;
  font-style: normal;
  letter-spacing: -0.01em;
}

.input-with-prefix {
  display: inline-flex;
  align-items: center;
  gap: 0;
  position: relative;
  border: 1px solid var(--border-normal, #e8e8e8);
  border-radius: 6px;
  background: var(--background-page, #ffffff);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  min-height: 44px;
}

.input-prefix {
  display: inline-flex;
  align-items: center;
  padding: 0 16px 0 16px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--foreground-subdued, #6b7280);
  letter-spacing: 0.2px;
  white-space: nowrap;
  border: none;
  border-right: 1px solid var(--border-normal, #e5e7eb);
  height: 100%;
  min-height: 42px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  flex-shrink: 0;
  margin-right: 1px;
}

.input-with-prefix-input {
  flex: 1;
  min-width: 0;
  display: flex;
}

.input-with-prefix-input :deep(.v-input) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  width: 100%;
}

.input-with-prefix-input :deep(.v-input__control) {
  padding-left: 12px;
  padding-right: 16px;
}

.input-with-prefix-input :deep(input) {
  padding-left: 0;
}

.input-with-prefix:hover {
  border-color: var(--border-normal, #d1d5db);
}

.input-with-prefix:hover .input-prefix {
  color: var(--foreground, #1a1a1a);
}

.input-with-prefix:focus-within {
  border-color: var(--primary, #6c5ce7);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.input-with-prefix:focus-within .input-prefix {
  color: var(--foreground, #1a1a1a);
}

.field-error-state {
  border-color: var(--danger, #e54848) !important;
  box-shadow: 0 0 0 3px rgba(229, 72, 72, 0.1) !important;
}

.field-error-state :deep(.v-input),
.field-error-state :deep(textarea) {
  border-color: var(--danger, #e54848) !important;
}

.field-error-state.input-with-prefix {
  background: #fef2f2;
  border-color: var(--danger, #e54848) !important;
}

.field-error-state.input-with-prefix .input-prefix {
  color: var(--danger, #e54848);
  border-right-color: rgba(229, 72, 72, 0.3);
  background: #fef2f2;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--danger, #e54848);
  font-size: 13px;
  margin-top: 4px;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
  border-left: 3px solid var(--danger, #e54848);
}

.actions-container {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
  padding-top: 24px;
  border-top: 1px solid var(--border-normal, #e8e8e8);
}

.actions-container :deep(.v-button) {
  min-width: 180px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.actions-container :deep(.v-button:hover) {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* Configurations List Styles */
.configs-list-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.configs-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.empty-configs {
  padding: 40px 20px;
}

.configs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.config-card {
  background: #ffffff;
  border: 1px solid var(--border-normal, #e8e8e8);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.config-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.config-card.config-active {
  border-left: 4px solid var(--success, #10b981);
  background: linear-gradient(135deg, var(--success-background, #f0fdf4) 0%, var(--background-page, #ffffff) 100%);
}

.config-card.config-inactive {
  border-left: 4px solid var(--foreground-subdued, #9ca3af);
  opacity: 0.85;
}

.config-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
}

.config-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-status :deep(.v-icon.status-active) {
  color: var(--foreground, #1a1a1a);
  font-size: 24px;
}

.config-status :deep(.v-icon.status-inactive) {
  color: var(--foreground, #1a1a1a);
  font-size: 24px;
  opacity: 0.5;
}

.status-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
}

.config-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.config-actions :deep(.v-button) {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.config-actions :deep(.v-button[type="success"]) {
  color: var(--success, #10b981);
}

.config-actions :deep(.v-button[type="success"]:hover) {
  background: var(--success-background, rgba(16, 185, 129, 0.1));
  transform: scale(1.05);
}

.config-card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.config-field-label :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  font-size: 14px;
  opacity: 0.7;
}

.config-field-value {
  font-size: 14px;
  color: var(--foreground, #1a1a1a);
  line-height: 1.5;
}

.config-condizione-preview {
  max-height: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
}

.config-form-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.config-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
}

.form-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid var(--border-normal, #e8e8e8);
  margin-bottom: 8px;
}

.toggle-section-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
}

.toggle-section-label :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.8;
}

.toggle-section-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .deviazione-container {
    padding: 20px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .page-header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .azienda-header {
    padding: 16px 20px;
    margin-bottom: 24px;
  }

  .numero-assegnato-section {
    padding: 28px 20px;
    margin-bottom: 40px;
  }

  .numero-assegnato-value {
    font-size: 38px;
    letter-spacing: 1px;
  }

  .numero-assegnato-label {
    font-size: 11px;
    margin-bottom: 16px;
  }

  .codici-test-info {
    margin-top: 32px;
    padding-top: 24px;
  }

  .codice-item {
    padding: 14px 16px;
  }

  .codice-value {
    font-size: 13px;
    padding: 6px 12px;
  }

  .form-container {
    gap: 24px;
  }

  .form-section-toggle {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .field-label-with-action {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .field-label {
    width: 100%;
  }

  .default-text-btn {
    width: 100%;
  }

  .default-text-btn :deep(.v-button) {
    width: 100%;
  }

  .form-field-small {
    max-width: 100%;
  }

  .actions-container {
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
    padding-top: 20px;
  }

  .actions-container :deep(.v-button) {
    width: 100%;
    min-width: 100%;
  }

  .configs-list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .configs-grid {
    grid-template-columns: 1fr;
  }

  .config-form-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
