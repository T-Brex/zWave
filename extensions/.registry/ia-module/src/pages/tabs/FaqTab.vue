<template>
  <div class="faq-tab">
    <div class="faq-header">
      <input
        v-model="search"
        class="faq-search"
        placeholder="Cerca FAQ…"
      />

      <div class="faq-actions">
        <button class="btn-secondary" type="button" @click="openImport">
          Importa CSV
        </button>

        <button class="btn-primary" type="button" @click="openCreate">
          + Aggiungi FAQ
        </button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <FaqCard
      v-for="f in filteredFaqs"
      :key="f.id"
      :faq="f"
      @delete="askDelete"
    />

    <FaqModal
      v-if="showModal"
      :faq="null"
      @close="showModal = false"
      @saved="reload"
    />

    <ConfirmDeleteModal
      v-if="toDelete"
      :faq="toDelete"
      :loading="deleting"
      :error="deleteError"
      @cancel="toDelete = null"
      @confirm="confirmDelete"
    />

    <ImportFaqModal
      v-if="showImport"
      @close="showImport = false"
      @imported="onImported"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { injectAzienda } from '../../composables/useAzienda';
import FaqCard from '../../components/FaqCard.vue';
import FaqModal from '../../components/FaqModal.vue';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal.vue';
import ImportFaqModal from '../../components/ImportFaqModal.vue';

const api = useApi();
const selectedAzienda = injectAzienda();
const faqs = ref([]);
const showModal = ref(false);
const showImport = ref(false);
const search = ref('');
const error = ref('');
const deleteError = ref('');

const toDelete = ref(null);
const deleting = ref(false);

const filteredFaqs = computed(() =>
  faqs.value.filter((f) => {
    const q = search.value.toLowerCase();
    return (
      String(f.domanda || '').toLowerCase().includes(q) ||
      String(f.risposta || '').toLowerCase().includes(q)
    );
  })
);

async function reload() {
  showModal.value = false;
  showImport.value = false;
  error.value = '';
  let data = [];
  
  const params = {
    fields: ['id', 'domanda', 'risposta', 'azienda'],
    sort: ['-id'],
    limit: 100,
  };

  // Escludi record con delete: true e filtra per azienda se selezionata
  params.filter = { delete: { _neq: true } };
  if (selectedAzienda.selectedAzienda?.value) {
    params.filter.azienda = { _eq: selectedAzienda.selectedAzienda.value };
  }

  try {
    const res = await api.get('/items/faq', { params });
    data = res?.data?.data ?? [];
  } catch (e) {
    try {
      const res = await api.get('/items/faq', { params });
      data = res?.data?.data ?? [];
    } catch (err) {
      faqs.value = [];
      error.value = 'Errore caricamento FAQ';
      return;
    }
  }
  faqs.value = data;
}

onMounted(() => {
  reload();
});

// Ricarica quando cambia l'azienda
watch(() => selectedAzienda.selectedAzienda?.value, () => {
  reload();
}, { immediate: false });

function openCreate() {
  showModal.value = true;
}

function openImport() {
  showImport.value = true;
}

async function onImported() {
  showImport.value = false;
  await reload();
}

function askDelete(faq) {
  deleteError.value = '';
  toDelete.value = faq;
}

async function confirmDelete() {
  if (!toDelete.value || deleting.value) return;
  deleting.value = true;
  const id = toDelete.value.id;
  try {
    // 1. Imposta delete: true (rimuove dalla lista al prossimo reload)
    let updated = false;
    const attempts = [
      () => api.patch(`/items/faq/${id}`, { delete: true }),
      () =>
        api.patch('/items/faq', {
          keys: [id],
          data: { delete: true },
        }),
      () =>
        api.patch(
          '/items/faq',
          { data: { delete: true } },
          { params: { 'filter[id][_eq]': id } }
        ),
    ];
    for (const attempt of attempts) {
      try {
        await attempt();
        updated = true;
        break;
      } catch (e) {
        // Try next strategy
      }
    }
    if (!updated) {
      throw new Error('update_failed');
    }

    // 2. Rimuovi subito dall'interfaccia e chiudi il modal
    faqs.value = faqs.value.filter((f) => f.id !== id);
    deleteError.value = '';
    toDelete.value = null;

    // 3. Dopo 10 secondi elimina definitivamente dalla collection
    setTimeout(async () => {
      try {
        await api.delete(`/items/faq/${id}`);
      } catch (e) {
        console.error('Errore durante eliminazione definitiva FAQ:', e);
      }
    }, 10000);
  } catch (e) {
    deleteError.value = 'Errore durante eliminazione FAQ';
  } finally {
    deleting.value = false;
  }
}

</script>

<style scoped>
.faq-tab {
  display: grid;
  gap: 20px;
}

.faq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
  flex-wrap: wrap;
}

.faq-search {
  width: 360px;
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

.faq-search:focus {
  outline: none;
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
}

.faq-actions {
  display: flex;
  gap: 12px;
}

.btn-primary {
  height: 44px;
  background: linear-gradient(135deg, #5e72e4 0%, #7c8de8 100%);
  color: white;
  border-radius: 10px;
  border: 1px solid #5e72e4;
  padding: 0 20px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(94, 114, 228, 0.2), 0 1px 3px rgba(94, 114, 228, 0.1);
}

.btn-primary:hover {
  box-shadow: 0 4px 6px rgba(94, 114, 228, 0.25), 0 2px 4px rgba(94, 114, 228, 0.15);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(94, 114, 228, 0.2);
}

.btn-secondary {
  height: 44px;
  background: var(--background, #ffffff);
  color: var(--foreground, #1a1a1a);
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  padding: 0 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-secondary:hover {
  background: var(--background-subdued, #f9fafb);
  border-color: var(--border-color, #d1d5db);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.btn-secondary:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.error {
  color: #ef4444;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
</style>

