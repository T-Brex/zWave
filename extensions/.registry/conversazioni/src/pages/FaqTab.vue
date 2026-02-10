<template>
  <div class="faq-tab">
    <div class="faq-header">
      <v-input
        v-model="search"
        placeholder="Cerca nelle FAQ..."
        class="search-input"
      >
        <template #prepend>
          <v-icon name="search" />
        </template>
      </v-input>

      <v-button @click="openFaqCreate">
        <v-icon name="add" left />
        Aggiungi FAQ
      </v-button>
    </div>

    <div v-if="faqUi.loading" class="faq-loading">
      <v-progress-circular indeterminate small />
      <span>Caricamento FAQ...</span>
    </div>

    <v-info
      v-else-if="faqUi.error"
      type="danger"
      icon="error"
      :title="faqUi.error"
      class="faq-error"
    />

    <div v-else-if="faqUi.items.length === 0" class="no-results">
      <v-icon name="inbox" size="48" />
      <p>Nessuna FAQ trovata</p>
    </div>

    <div v-else class="faq-cards">
      <div
        v-for="faq in faqUi.items"
        :key="faq.id"
        class="faq-card"
      >
        <div class="faq-card-left">
          <div class="faq-card-title">{{ faq.domanda || 'Domanda senza testo' }}</div>
          <div class="faq-card-preview">{{ faq.risposta || 'Nessuna risposta' }}</div>
        </div>
        <div class="faq-card-actions">
          <button
            class="faq-icon-btn"
            @click="openFaqEdit(faq)"
            title="Modifica"
          >
            <v-icon name="edit" />
          </button>
          <button
            class="faq-icon-btn danger"
            @click="deleteFaq(faq.id, faq.domanda)"
            title="Elimina"
          >
            <v-icon name="delete" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const FAQ_COLLECTION = 'faq';
const search = ref('');

const faqUi = reactive({
  loading: false,
  error: null,
  items: [],
});

async function loadFaqs() {
  faqUi.loading = true;
  faqUi.error = null;
  try {
    const response = await api.get(`/items/${FAQ_COLLECTION}`, {
      params: {
        limit: -1,
        sort: ['id'],
        fields: ['id', 'domanda', 'risposta'],
        search: search.value || null,
      },
    });
    faqUi.items = response?.data?.data || [];
  } catch (e) {
    faqUi.error = e?.message || 'Errore caricamento FAQ';
    faqUi.items = [];
  } finally {
    faqUi.loading = false;
  }
}

function openFaqCreate() {
  window.location.href = `/admin/content/${FAQ_COLLECTION}/+`;
}

function openFaqEdit(faq) {
  window.location.href = `/admin/content/${FAQ_COLLECTION}/${faq.id}`;
}

async function deleteFaq(id, domanda) {
  if (!id) return;
  const ok = window.confirm(`Vuoi eliminare questa FAQ?\n\n${domanda || ''}`);
  if (!ok) return;
  try {
    await api.delete(`/items/${FAQ_COLLECTION}/${id}`);
    await loadFaqs();
  } catch (e) {
    alert(`Errore nell'eliminazione: ${e?.message || 'Errore sconosciuto'}`);
  }
}

loadFaqs();
</script>

<style scoped>
.faq-tab {
  width: 100%;
}

.faq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.faq-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--foreground-subdued, #6b7280);
  padding: 32px 0;
}

.faq-error {
  padding: 16px 0;
}

.no-results {
  text-align: center;
  padding: 64px 24px;
  color: var(--foreground-subdued, #6b7280);
}

.no-results p {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.faq-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faq-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 24px;
  border: 1px solid var(--border-normal, #e8e8e8);
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.faq-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: #d1d5db;
}

.faq-card-left {
  min-width: 0;
  flex: 1;
}

.faq-card-title {
  font-weight: 700;
  color: var(--foreground, #1a1a1a);
  margin-bottom: 8px;
  font-size: 16px;
  letter-spacing: -0.01em;
  line-height: 1.4;
}

.faq-card-preview {
  color: var(--foreground-subdued, #6b7280);
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14px;
  letter-spacing: -0.01em;
}

.faq-card-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.faq-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border-normal, #e8e8e8);
  background: var(--background-page, #ffffff);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.faq-icon-btn:hover {
  border-color: var(--primary, #6c5ce7);
  box-shadow: 0 2px 8px rgba(108, 92, 231, 0.15);
  transform: scale(1.05);
}

.faq-icon-btn.danger:hover {
  border-color: var(--danger, #e54848);
  box-shadow: 0 2px 8px rgba(229, 72, 72, 0.15);
}
</style>
