<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ isEdit ? 'Modifica file' : 'Aggiungi file' }}</h3>

      <p v-if="isEdit && currentFileName" class="current-file">
        File attuale: {{ currentFileName }}
      </p>

      <div class="field">
        <div class="label">File</div>
        <v-upload v-model="fileValue" :multiple="false" />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button class="cancel" type="button" @click="emit('close')">Annulla</button>
        <button class="save" type="button" @click="save" :disabled="saving">
          {{ saving ? 'Salvataggio…' : 'Salva' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'saved']);
const api = useApi();

const saving = ref(false);
const error = ref('');
const fileValue = ref(null);

const isEdit = computed(() => Boolean(props.item?.id));
const currentFileName = computed(
  () => props.item?.file?.filename_download || props.item?.nome || ''
);

async function save() {
  error.value = '';
  saving.value = true;

  try {
    let resolvedFileId = normalizeFileId(fileValue.value);
    const fileObject = extractFileObject(fileValue.value);

    let resolvedName =
      normalizeFileName(fileValue.value) ||
      props.item?.nome ||
      props.item?.file?.filename_download ||
      'File';

    if (!resolvedFileId && fileObject) {
      const formData = new FormData();
      formData.append('file', fileObject);
      const uploadRes = await api.post('/files', formData);
      const uploaded = uploadRes?.data?.data;
      resolvedFileId = uploaded?.id || null;
      resolvedName = resolvedName || uploaded?.filename_download || fileObject.name;
    }

    if (!resolvedFileId && isEdit.value) {
      if (typeof props.item?.file === 'string') resolvedFileId = props.item.file;
      else resolvedFileId = props.item?.file?.id || null;
    }

    if (!resolvedFileId) {
      error.value = 'Seleziona un file valido';
      return;
    }

    if (isEdit.value) {
      await api.patch(`/items/file/${props.item.id}`, {
        nome: resolvedName,
        file: resolvedFileId,
      });
    } else {
      await api.post('/items/file', {
        nome: resolvedName,
        file: resolvedFileId,
      });
    }

    emit('saved');
    emit('close');
  } catch (e) {
    error.value = 'Errore durante il salvataggio';
  } finally {
    saving.value = false;
  }
}

function extractFileObject(value) {
  if (!value) return null;
  if (Array.isArray(value)) return extractFileObject(value[0]);
  if (value instanceof File) return value;
  if (typeof value === 'object') {
    if (value.file instanceof File) return value.file;
    if (value.raw instanceof File) return value.raw;
    if (value.value instanceof File) return value.value;
  }
  return null;
}

function normalizeFileId(value) {
  if (!value) return null;
  if (Array.isArray(value)) return normalizeFileId(value[0]);
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value.id) return value.id;
    if (typeof value.file === 'string') return value.file;
    if (value.file?.id) return value.file.id;
    if (value.value) return value.value;
  }
  return null;
}

function normalizeFileName(value) {
  if (!value) return null;
  if (Array.isArray(value)) return normalizeFileName(value[0]);
  if (value instanceof File) return value.name;
  if (typeof value === 'object') {
    return (
      value.title ||
      value.filename_download ||
      value.name ||
      value.file?.filename_download ||
      value.file?.name ||
      value.value?.name ||
      null
    );
  }
  return null;
}

watch(
  () => props.item,
  (item) => {
    fileValue.value = null;
  },
  { immediate: true }
);
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  width: 520px;
  background: white;
  border-radius: 16px;
  padding: 32px;
}

.current-file {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.field {
  margin-top: 12px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.save {
  background: #6c5ce7;
  color: white;
  border-radius: 10px;
  border: none;
  padding: 10px 14px;
}

.cancel {
  background: transparent;
  border-radius: 10px;
  border: 1px solid #ddd;
  padding: 10px 14px;
}

.error {
  color: #e54848;
  margin-top: 8px;
}
</style>
