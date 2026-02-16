<template>
  <div class="prompt-page">
    <CompanySelector
      v-model="selectedClientId"
      @selected="onAziendaSelected"
    />
    <PromptEditor />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { injectAzienda } from '../composables/useAzienda';
import PromptEditor from '../components/PromptEditor.vue';
import CompanySelector from '../../common/components/CompanySelector.vue';

const { setAzienda } = injectAzienda();
const selectedClientId = ref(null);

function onAziendaSelected(payload) {
  setAzienda(payload?.azienda ?? null);
}
</script>

<style scoped>
.prompt-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
