<template>
  <div class="overlay" @click.self="$emit('cancel')">
    <div class="modal" role="dialog" aria-modal="true">
      <h3>Stai per cancellare una FAQ</h3>
      <p>
        <strong>{{ faq?.domanda }}</strong>
      </p>
      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button type="button" class="cancel" @click="$emit('cancel')">Annulla</button>
        <button type="button" class="danger" :disabled="loading" @click="$emit('confirm')">
          {{ loading ? 'Eliminazione…' : 'Elimina' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  faq: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
defineEmits(['cancel', 'confirm']);
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  padding: 24px;
}

.modal {
  width: 520px;
  max-width: 90vw;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #eee;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.cancel {
  background: transparent;
  border-radius: 10px;
  border: 1px solid #ddd;
  padding: 10px 14px;
  cursor: pointer;
}

.danger {
  background: #e74c3c;
  color: white;
  border-radius: 10px;
  border: 1px solid #e74c3c;
  padding: 10px 14px;
  cursor: pointer;
}

.danger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  color: #e54848;
  margin-top: 8px;
}
</style>

