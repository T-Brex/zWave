<template>
  <div class="faq-card">
    <div class="faq-content">
      <h4>{{ faq.domanda }}</h4>
      <p class="preview">{{ faq.risposta }}</p>
    </div>

    <div class="faq-actions">
      <button type="button" class="icon-btn delete" title="Elimina" @click="$emit('delete', faq)">
        <TrashIcon class="icon" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { TrashIcon } from '@heroicons/vue/24/outline';

defineProps({
  faq: {
    type: Object,
    required: true,
  },
});
defineEmits(['delete']);
</script>

<style scoped>
.faq-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 12px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.faq-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  border-color: var(--border-color, #d1d5db);
}

.faq-content {
  flex: 1;
  padding-right: 16px;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: break-word;
}

.faq-content h4 {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.01em;
  line-height: 1.4;
  overflow-wrap: break-word;
  word-break: break-word;
}

.faq-content .preview {
  margin: 0;
  font-size: 13px;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.5;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
}

.faq-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.icon-btn:hover {
  background: var(--background-subdued, #f9fafb);
  border-color: var(--border-color, #d1d5db);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.icon-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.icon {
  width: 18px;
  height: 18px;
}

.icon-btn.delete {
  color: #ef4444;
}

.icon-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}
</style>

