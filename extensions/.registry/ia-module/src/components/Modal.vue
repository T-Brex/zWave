<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="onUpdate"
    @esc="close"
  >
    <v-card class="modal-card">
      <v-card-title v-if="title" class="modal-title">
        <v-icon v-if="icon" :name="icon" />
        <span>{{ title }}</span>
      </v-card-title>

      <v-card-text class="modal-body">
        <slot />
      </v-card-text>

      <v-card-actions class="modal-actions">
        <slot name="actions">
          <v-button secondary @click="close">Annulla</v-button>
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

function close() {
  emit('update:modelValue', false);
}

function onUpdate(value) {
  emit('update:modelValue', value);
}
</script>

<style scoped>
.modal-card {
  width: 720px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.modal-body {
  flex: 1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
