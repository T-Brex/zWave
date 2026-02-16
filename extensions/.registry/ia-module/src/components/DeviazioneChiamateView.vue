<template>
  <div class="deviazione-container">
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Attivazione Numero</h1>
      </div>
    </div>

    <!-- No Azienda Selected -->
    <v-info
      v-if="!selectedAzienda"
      icon="info"
      title="Seleziona un'azienda"
      text="Scegli un'azienda dal selettore in alto a destra per visualizzare il numero di deviazione chiamata."
    />

    <!-- Loading State -->
    <div v-else-if="loading" class="loading-container">
      <v-progress-circular indeterminate />
      <span>Caricamento dati...</span>
    </div>

    <!-- Error State -->
    <v-info
      v-else-if="error"
      type="danger"
      icon="error"
      :title="error.title || 'Errore'"
      :text="error.message || 'Si è verificato un errore durante il caricamento.'"
    >
      <template #append>
        <v-button @click="loadData" :loading="loading">Riprova</v-button>
      </template>
    </v-info>

    <!-- Main Content: Numero assegnato + Codici USSD -->
    <div v-else class="main-content">
      <div class="numero-assegnato-section">
        <div class="numero-assegnato-label">Numero telefonico assegnato</div>

        <div class="numero-assegnato-row">
          <div class="numero-assegnato-value">
            {{ formattedNumeroAssegnato || 'Nessun numero assegnato' }}
          </div>
        </div>

        <!-- Codici di deviazione (solo se c'è un numero) -->
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

      <!-- Link alla sezione Trasferimento Operatore -->
      <div class="trasferimento-link-section">
        <v-info
          icon="phone_forwarded"
          title="Trasferimento operatore"
          text="Per configurare quando e verso quale numero l'agente IA deve trasferire le chiamate (es. a un operatore), usa la sezione Trasferimento Operatore nel menu laterale."
        >
          <template #append>
            <v-button secondary @click="goToTrasferimento">
              <v-icon name="phone_forwarded" left />
              Vai a Trasferimento Operatore
            </v-button>
          </template>
        </v-info>
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

const COLLECTION_DEVIAZIONE = 'deviazione_chiamata';

const loading = ref(false);
const error = ref(null);

const numeroAssegnato = ref('');
const currentRecordId = ref(null);

// Numero senza prefisso per i codici USSD
const numeroSenzaPrefisso = computed(() => {
  if (!numeroAssegnato.value) return '';
  let cleaned = numeroAssegnato.value.replace(/[^\d]/g, '');
  if (cleaned.startsWith('39') && cleaned.length > 10) cleaned = cleaned.substring(2);
  return cleaned;
});

// Formattazione display (es. +39 333 123 4567)
const formattedNumeroAssegnato = computed(() => {
  if (!numeroAssegnato.value) return '';
  const numero = numeroSenzaPrefisso.value;
  if (!numero) return '';
  if (numero.length === 10) return `+39 ${numero.substring(0, 4)} ${numero.substring(4, 7)} ${numero.substring(7)}`;
  if (numero.length === 9) return `+39 ${numero.substring(0, 3)} ${numero.substring(3, 6)} ${numero.substring(6)}`;
  if (numero.length === 11) return `+39 ${numero.substring(0, 4)} ${numero.substring(4, 7)} ${numero.substring(7)}`;
  return `+39 ${numero}`;
});

async function loadData() {
  if (!selectedAzienda.value) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await api.get(`/items/${COLLECTION_DEVIAZIONE}`, {
      params: {
        fields: ['id', 'numero_assegnato', 'azienda'],
        limit: 1,
        sort: ['-date_created'],
        filter: { azienda: { _eq: selectedAzienda.value } },
      },
    });

    const items = response?.data?.data || [];
    const item = items.length > 0 ? items[0] : null;

    currentRecordId.value = null;
    numeroAssegnato.value = '';

    if (item) {
      currentRecordId.value = item.id;
      numeroAssegnato.value = item.numero_assegnato || '';
    }
  } catch (err) {
    const status = err?.response?.status;
    const message = err?.response?.data?.errors?.[0]?.message || err?.message || 'Errore sconosciuto';
    if (status === 403) {
      error.value = { title: 'Accesso negato', message: `Non hai i permessi per accedere alla collection "${COLLECTION_DEVIAZIONE}".` };
    } else if (status === 404) {
      error.value = { title: 'Collection non trovata', message: `La collection "${COLLECTION_DEVIAZIONE}" non esiste.` };
    } else {
      error.value = { title: 'Errore di caricamento', message: `Impossibile caricare i dati: ${message}` };
    }
  } finally {
    loading.value = false;
  }
}

// Navigazione verso Trasferimento Operatore (evento per il parent)
const emit = defineEmits(['navigate']);
function goToTrasferimento() {
  emit('navigate', 'trasferimento-chiamate');
}

onMounted(() => {
  if (selectedAzienda.value) loadData();
});

watch(selectedAzienda, (newVal, oldVal) => {
  if (newVal === oldVal) return;
  if (newVal) loadData();
  else {
    currentRecordId.value = null;
    numeroAssegnato.value = '';
    error.value = null;
  }
});
</script>

<style scoped>
.deviazione-container {
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px 24px;
  color: var(--foreground-subdued, #666);
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.numero-assegnato-section {
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

.numero-assegnato-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 8px;
}

.numero-assegnato-value {
  font-size: 52px;
  font-weight: 700;
  color: var(--foreground, #1a1a1a);
  line-height: 1.2;
  word-break: break-all;
  text-align: center;
  letter-spacing: 2px;
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
  background: linear-gradient(135deg, var(--danger-background, #fef2f2) 0%, #ffffff 100%);
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
  background: #ffffff;
  border-color: var(--danger-background, #fee2e2);
}

.codice-label {
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.6;
  letter-spacing: -0.01em;
}

.trasferimento-link-section {
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e8e8e8);
}

.trasferimento-link-section :deep(.v-info) {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .deviazione-container {
    padding: 20px;
  }

  .page-title {
    font-size: 20px;
  }

  .numero-assegnato-section {
    padding: 28px 20px;
  }

  .numero-assegnato-value {
    font-size: 38px;
    letter-spacing: 1px;
  }
}
</style>
