<template>
  <div class="import-row">
    <input type="file" class="file" accept=".csv,text/csv" :disabled="disabled" @change="upload" />
    <a class="example" :href="exampleHref" download="faq-example.csv">Scarica CSV di esempio</a>
  </div>
</template>

<script setup>
defineProps({
  disabled: { type: Boolean, default: false },
});

const EXAMPLE_CSV = `domanda,risposta
"Come funziona il servizio?","Il servizio funziona così..."
"Posso cancellare?","Sì, puoi cancellare in ogni momento"
`;

const exampleHref = `data:text/csv;charset=utf-8,${encodeURIComponent(EXAMPLE_CSV)}`;

const emit = defineEmits(['file']);

function upload(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;
  emit('file', file);
  e.target.value = '';
}
</script>

<style scoped>
.import-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.file {
  min-width: 280px;
}

.example {
  color: #6c5ce7;
  text-decoration: none;
  font-weight: 700;
}

.example:hover {
  text-decoration: underline;
}
</style>

