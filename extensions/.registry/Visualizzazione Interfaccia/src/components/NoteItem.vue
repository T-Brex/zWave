<template>
  <div class="note-item">
    <div v-if="!isEditing" class="note-content-wrapper">
      <div class="note-bubble">
        <div class="note-text">{{ note }}</div>
      </div>
      <div class="note-actions">
        <button
          class="note-action-btn edit-btn"
          @click="startEdit"
          title="Modifica nota"
        >
          <v-icon name="edit" small />
        </button>
        <button
          class="note-action-btn delete-btn"
          @click="$emit('delete')"
          title="Elimina nota"
        >
          <v-icon name="delete" small />
        </button>
      </div>
    </div>
    <div v-else class="note-edit-wrapper">
      <v-textarea
        v-model="editText"
        rows="3"
        class="note-edit-input"
        placeholder="Modifica la nota..."
        @keydown="inputHandlers.handleKeydown"
        @keyup="inputHandlers.handleKeyup"
        @input="inputHandlers.handleInput"
      />
      <div class="note-edit-actions">
        <v-button @click="save" :loading="saving" small>
          <v-icon name="check" left small />
          Salva
        </v-button>
        <v-button @click="cancel" secondary small>
          Annulla
        </v-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { createInputHandler } from '../utils/inputHandlers';

const props = defineProps({
  note: {
    type: String,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  saving: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['edit', 'save', 'cancel', 'delete']);

const editText = ref(props.note);

watch(() => props.note, (newNote) => {
  if (!props.isEditing) {
    editText.value = newNote;
  }
});

watch(() => props.isEditing, (isEditing) => {
  if (isEditing) {
    editText.value = props.note;
  } else {
    editText.value = props.note;
  }
});

const inputHandlers = createInputHandler(editText);

function startEdit() {
  emit('edit');
}

function save() {
  if (editText.value.trim()) {
    emit('save', editText.value);
  }
}

function cancel() {
  emit('cancel');
}
</script>

<style scoped>
.note-item {
  position: relative;
  z-index: 1;
  margin-bottom: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.note-content-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.note-bubble {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #fde68a;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.12);
  position: relative;
  transition: all 0.2s ease;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-wrap: break-word;
  overflow: hidden;
}

.note-bubble:hover {
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
  transform: translateY(-1px);
}

.note-text {
  color: #92400e;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 13px;
  font-weight: 500;
}

.note-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.25s ease;
  margin-top: 4px;
}

.note-item:hover .note-actions {
  opacity: 1;
}

.note-item:hover .note-bubble {
  border-left-color: #d97706;
}

.note-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--foreground-subdued, #6b7280);
}

.note-action-btn:hover {
  border-color: var(--primary, #5e72e4);
  background: var(--background-subdued, #f9fafb);
  color: var(--primary, #5e72e4);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.note-action-btn.delete-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.note-edit-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--background-subdued, #f9fafb);
  border: 2px solid #f59e0b;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
  position: relative;
  z-index: 10;
  margin-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.note-edit-input {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.note-edit-input :deep(textarea) {
  width: 100% !important;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.note-edit-input textarea {
  border-color: #fcd34d;
  background: #ffffff;
}

.note-edit-input textarea:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.note-edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
