<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ faq ? 'Modifica FAQ' : 'Nuova FAQ' }}</h3>

      <input
        v-model="domanda"
        placeholder="Scrivi qui la domanda frequente"
        maxlength="300"
      />

      <textarea
        v-model="risposta"
        placeholder="Scrivi qui la risposta"
        maxlength="1200"
      ></textarea>

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
import { ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { injectAzienda } from '../composables/useAzienda';

const props = defineProps({
  faq: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved']);
const api = useApi();
const selectedAzienda = injectAzienda();

const domanda = ref('');
const risposta = ref('');
const saving = ref(false);
const error = ref('');

watch(
  () => props.faq,
  (f) => {
    domanda.value = f?.domanda ?? '';
    risposta.value = f?.risposta ?? '';
  },
  { immediate: true }
);

async function save() {
  error.value = '';
  if (!domanda.value.trim() || !risposta.value.trim()) {
    error.value = 'Domanda e risposta sono obbligatorie';
    return;
  }

  saving.value = true;
  try {
    const basePayload = {
      domanda: domanda.value.trim(),
      risposta: risposta.value.trim(),
    };

    // Aggiungi azienda, id_user e id_agente del cliente selezionato (solo per nuovi record)
    if (!props.faq && selectedAzienda.selectedAzienda?.value) {
      basePayload.azienda = selectedAzienda.selectedAzienda.value;
      try {
        const clientiRes = await api.get('/items/clienti', {
          params: {
            filter: { azienda: { _eq: selectedAzienda.selectedAzienda.value } },
            fields: ['id_user', 'agent_elevenlabs'],
            limit: 1,
          },
        });
        const cliente = clientiRes?.data?.data?.[0];
        if (cliente?.id_user) {
          basePayload.id_user = cliente.id_user;
        }
        if (cliente?.agent_elevenlabs) {
          basePayload.id_agente = cliente.agent_elevenlabs;
        }
      } catch (e) {
        // Continua senza id_user/id_agente se il cliente non è trovato
      }
    }

    if (props.faq) {
      await api.patch(`/items/faq/${props.faq.id}`, basePayload);
    } else {
      await api.post('/items/faq', basePayload);
    }

    emit('saved');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  width: 640px;
  max-width: 90vw;
  background: #fff;
  border-radius: 16px;
  padding: 32px;
}

input,
textarea {
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #ddd;
  font: inherit;
}

textarea {
  min-height: 180px;
  resize: vertical;
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
  border: 1px solid #6c5ce7;
  padding: 10px 14px;
}

.save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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

