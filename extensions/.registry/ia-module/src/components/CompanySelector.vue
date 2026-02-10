<template>
  <div class="company-selector-wrapper">
    <!-- Pulsante selezione azienda in alto a destra -->
    <div class="company-selector-header">
      <v-button
        v-tooltip="selectedAzienda ? 'Cambia azienda' : 'Seleziona azienda'"
        :secondary="!!selectedAzienda"
        :type="selectedAzienda ? 'secondary' : 'primary'"
        @click="drawerOpen = true"
        class="azienda-select-button"
      >
        <v-icon name="business" left />
        <span class="azienda-button-text">
          {{ selectedAzienda || 'Seleziona azienda' }}
        </span>
        <v-icon name="arrow_drop_down" right />
      </v-button>
    </div>

    <!-- Drawer per selezione aziende (destra) -->
    <v-drawer
      v-model="drawerOpen"
      side="right"
      :title="drawerTitle"
      width="320"
    >
      <div class="drawer-content">
        <!-- Header con pulsanti -->
        <div class="drawer-header">
          <div class="drawer-header-title">
            <v-icon name="business" />
            <span>Seleziona Azienda</span>
          </div>
          <div class="drawer-header-actions">
            <v-button
              v-tooltip="'Aggiorna lista aziende'"
              icon
              secondary
              :loading="aziendeLoading"
              @click="loadAziende"
            >
              <v-icon name="refresh" />
            </v-button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="aziendeLoading" class="drawer-loading">
          <v-progress-circular indeterminate />
          <span>Caricamento aziende...</span>
        </div>

        <!-- Error State -->
        <v-info
          v-else-if="aziendeError"
          type="danger"
          icon="error"
          :title="aziendeError.title || 'Errore caricamento'"
          :text="aziendeError.message || ''"
        >
          <template #append>
            <v-button @click="loadAziende" :loading="aziendeLoading">Riprova</v-button>
          </template>
        </v-info>

        <!-- Empty State -->
        <v-info
          v-else-if="aziende.length === 0"
          icon="info"
          title="Nessuna azienda"
          text="Non sono state trovate aziende nella collection clienti."
        />

        <!-- Lista Aziende -->
        <v-list v-else nav class="aziende-list">
          <v-list-item
            v-for="azienda in aziende"
            :key="azienda"
            class="azienda-item"
            :class="{ 'azienda-item--active': selectedAzienda === azienda }"
            @click="selectAzienda(azienda)"
          >
            <v-list-item-icon>
              <v-icon :name="selectedAzienda === azienda ? 'check_circle' : 'business'" />
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ azienda || 'Senza nome' }}</v-list-item-title>
            </v-list-item-content>
            <v-list-item-icon v-if="selectedAzienda === azienda">
              <v-icon name="check" />
            </v-list-item-icon>
          </v-list-item>
        </v-list>

        <!-- Azienda selezionata info -->
        <div v-if="selectedAzienda" class="selected-azienda-info">
          <div class="selected-azienda-label">Azienda attualmente selezionata:</div>
          <div class="selected-azienda-name">
            <v-icon name="check_circle" />
            <span>{{ selectedAzienda }}</span>
          </div>
        </div>
      </div>
    </v-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { injectAzienda } from '../composables/useAzienda';

const api = useApi();
const { useUserStore } = useStores();
const userStore = useUserStore();
const CLIENTI_COLLECTION = 'clienti';

// Aziende state
const aziende = ref([]);
const aziendeLoading = ref(false);
const aziendeError = ref(null);

// Usa il composable per l'azienda selezionata
const aziendaContext = injectAzienda();
const selectedAzienda = aziendaContext.selectedAzienda;

const isAdmin = computed(() => {
  const roleName = String(userStore.currentUser?.role?.name || '').toLowerCase();
  return (
    !!userStore.currentUser?.role?.admin_access ||
    roleName.includes('admin') ||
    roleName.includes('ammin')
  );
});
const isClientRole = computed(() => {
  const roleName = String(userStore.currentUser?.role?.name || '').toLowerCase();
  return (
    roleName.includes('client') ||
    roleName.includes('cliente') ||
    roleName.includes('customer') ||
    roleName.includes('utente') ||
    roleName.includes('user')
  );
});

// Drawer state
const drawerOpen = ref(false);
const drawerTitle = computed(() => {
  if (aziendeLoading.value) return 'Caricamento...';
  if (aziendeError.value) return 'Errore';
  return `Aziende (${aziende.value.length})`;
});

// Load aziende from clienti collection (extract unique values from azienda field)
async function loadAziende() {
  aziendeLoading.value = true;
  aziendeError.value = null;

  try {
    const response = await api.get(`/items/${CLIENTI_COLLECTION}`, {
      params: {
        fields: ['azienda'],
        limit: -1,
        ...( !isAdmin.value && isClientRole.value && userStore.currentUser?.id
          ? { filter: { id_user: { _eq: userStore.currentUser.id } } }
          : {} ),
      },
    });

    const items = response?.data?.data || [];
    
    // Extract unique azienda values (non-empty strings)
    const aziendeSet = new Set();
    items.forEach(item => {
      const aziendaValue = item?.azienda;
      if (aziendaValue && typeof aziendaValue === 'string' && aziendaValue.trim()) {
        aziendeSet.add(aziendaValue.trim());
      }
    });
    
    // Convert to sorted array
    aziende.value = Array.from(aziendeSet).sort();
    
    if (!isAdmin.value && aziende.value.length > 0) {
      aziendaContext.setAzienda(aziende.value[0]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ia_module_selected_azienda');
      }
      return;
    }

    const currentSelection = selectedAzienda.value?.trim();
    const hasValidSelection =
      currentSelection && aziende.value.includes(currentSelection);
    if (!hasValidSelection) {
      if (aziende.value.length > 0) {
        aziendaContext.setAzienda(aziende.value[0]);
      } else {
        aziendaContext.setAzienda(null);
      }
    }

    if (isAdmin.value && !selectedAzienda.value && aziende.value.length > 0) {
      aziendaContext.setAzienda(aziende.value[0]);
    }
  } catch (err) {
    console.error('Error loading aziende:', err);
    
    const status = err?.response?.status;
    const message = err?.response?.data?.errors?.[0]?.message || err?.message || 'Errore sconosciuto';
    
    if (status === 403) {
      aziendeError.value = {
        title: 'Accesso negato',
        message: `Non hai i permessi per accedere alla collection "${CLIENTI_COLLECTION}".`,
      };
    } else if (status === 404) {
      aziendeError.value = {
        title: 'Collection non trovata',
        message: `La collection "${CLIENTI_COLLECTION}" non esiste in Directus.`,
      };
    } else {
      aziendeError.value = {
        title: 'Errore di caricamento',
        message: `Impossibile caricare le aziende: ${message}`,
      };
    }
    aziende.value = [];
  } finally {
    aziendeLoading.value = false;
  }
}

const emit = defineEmits(['selected']);

// Select azienda
function selectAzienda(aziendaName) {
  if (!aziendaName || typeof aziendaName !== 'string') return;
  
  aziendaContext.setAzienda(aziendaName);
  
  // Emit event for parent component
  emit('selected', aziendaName);
}

// Expose methods for parent
defineExpose({
  selectedAzienda,
  selectAzienda,
  loadAziende,
});

onMounted(() => {
  loadAziende();
});
</script>

<style scoped>
.company-selector-wrapper {
  display: flex;
  align-items: center;
}

.company-selector-header {
  display: flex;
  align-items: center;
}

.azienda-select-button {
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.azienda-select-button :deep(.v-button) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  min-height: 44px;
  box-sizing: border-box;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: visible;
  line-height: 1.5;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.azienda-select-button :deep(.v-button:hover) {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
  border-color: var(--border-color, #d1d5db);
}

.azienda-select-button :deep(.v-button:active) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.azienda-select-button :deep(.v-icon) {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  vertical-align: middle;
  transition: all 0.2s ease;
}

.azienda-select-button :deep(.v-icon[name="business"]) {
  color: inherit;
  opacity: 0.85;
  margin: 0;
  padding: 0;
}

.azienda-select-button :deep(.v-icon[name="arrow_drop_down"]) {
  color: inherit;
  opacity: 0.65;
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.azienda-select-button :deep(.v-button:hover .v-icon[name="arrow_drop_down"]) {
  opacity: 0.85;
}

.azienda-button-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  letter-spacing: -0.01em;
  font-size: 13px;
  line-height: 1.4;
}

/* Drawer Styles */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.drawer-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  flex: 1;
  letter-spacing: -0.01em;
}

.drawer-header-title :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.8;
}

.drawer-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--foreground-subdued, #6b7280);
}

.drawer-loading span {
  font-size: 14px;
}

.aziende-list {
  flex: 1;
  overflow-y: auto;
}

.azienda-item {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  margin-bottom: 4px;
}

.azienda-item:hover {
  background: var(--background-subdued, #f9fafb);
}

.azienda-item--active {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-normal, #e8e8e8);
}

.azienda-item--active :deep(.v-list-item-content) {
  color: var(--foreground, #1a1a1a);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.azienda-item--active :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.9;
}

.selected-azienda-info {
  margin-top: auto;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.selected-azienda-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.selected-azienda-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
}

.selected-azienda-name :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
}
</style>
