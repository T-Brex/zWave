<template>
  <v-drawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
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
            :loading="loading"
            @click="$emit('refresh')"
          >
            <v-icon name="refresh" />
          </v-button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="drawer-loading">
        <v-progress-circular indeterminate />
        <span>Caricamento aziende...</span>
      </div>

      <!-- Error State -->
      <v-info
        v-else-if="error && availableAziende.length === 0"
        type="danger"
        icon="error"
        :title="error"
      >
        <template #append>
          <v-button @click="$emit('refresh')" :loading="loading">Riprova</v-button>
        </template>
      </v-info>

      <!-- Empty State -->
      <v-info
        v-else-if="availableAziende.length === 0"
        icon="info"
        title="Nessuna azienda"
        text="Non sono state trovate aziende nella collection clienti."
      />

      <!-- Lista Aziende -->
      <v-list v-else nav class="aziende-list">
        <v-list-item
          v-for="azienda in availableAziende"
          :key="azienda.value"
          class="azienda-item"
          :class="{ 'azienda-item--active': selectedAzienda === azienda.value }"
          @click="$emit('select', azienda.value)"
        >
          <v-list-item-icon>
            <v-icon :name="selectedAzienda === azienda.value ? 'check_circle' : 'business'" />
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ azienda.label || 'Senza nome' }}</v-list-item-title>
          </v-list-item-content>
          <v-list-item-icon v-if="selectedAzienda === azienda.value">
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
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  availableAziende: {
    type: Array,
    default: () => []
  },
  selectedAzienda: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'select', 'refresh']);

const drawerTitle = computed(() => {
  if (props.loading) return 'Caricamento...';
  if (props.error && props.availableAziende.length === 0) return 'Errore';
  return `Aziende (${props.availableAziende.length})`;
});
</script>

<style scoped>
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
