<template>
  <v-dialog :model-value="open" @update:model-value="$emit('update:open', $event)" @esc="$emit('close')">
    <v-card class="iframe-modal">
      <v-card-title class="modal-title">
        <v-icon :name="icon" />
        <span class="modal-title-text">{{ title }}</span>
      </v-card-title>

      <v-card-text class="iframe-modal-body">
        <iframe
          ref="iframeRef"
          class="embed-frame embed-frame--modal"
          :src="src"
          @load="onLoad"
        />
      </v-card-text>

      <v-card-actions class="faq-modal-actions">
        <v-button @click="$emit('close')" secondary>Annulla</v-button>
        <v-button @click="$emit('save')" :loading="saving">Salva</v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue';
import { injectEmbedStyles } from '../utils/iframeHelpers';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  icon: { type: String, default: 'edit' },
  src: { type: String, default: '' },
  saving: { type: Boolean, default: false },
});

defineEmits(['update:open', 'close', 'save']);

const iframeRef = ref(null);

function onLoad() {
  const frame = iframeRef.value;
  if (!frame) return;
  try {
    const doc = frame.contentDocument;
    injectEmbedStyles(doc, 'modal');
  } catch {
    // ignore (should be same-origin, but be safe)
  }
}
</script>

<style scoped>
.iframe-modal {
  width: 1100px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.iframe-modal-body {
  padding: 0;
  height: 75vh;
}

.embed-frame {
  width: 100%;
  height: 70vh;
  border: 0;
  border-radius: 10px;
  background: var(--background-page);
}

.embed-frame--modal {
  height: 75vh;
  border-radius: 0;
}

.modal-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.modal-title-text {
  font-weight: 700;
}

.faq-modal-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  width: 100%;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.faq-modal-actions :deep(.v-button) {
  width: auto;
  min-width: 120px;
}
</style>
