import { computed, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

export function usePrompt(selectedAzienda = null) {
  const api = useApi();
  
  const promptId = ref(null);
  const promptValue = ref('');
  const promptDraft = ref('');
  const firstMessageValue = ref('');
  const firstMessageDraft = ref('');
  const promptEditing = ref(false);
  const firstMessageEditing = ref(false);
  const promptSaving = ref(false);
  const firstMessageSaving = ref(false);
  const promptError = ref('');

  const promptDisplay = computed({
    get: () => (promptEditing.value ? promptDraft.value : promptValue.value),
    set: (value) => {
      if (promptEditing.value) promptDraft.value = value;
    },
  });

  const firstMessageDisplay = computed({
    get: () =>
      (firstMessageEditing.value ? firstMessageDraft.value : firstMessageValue.value),
    set: (value) => {
      if (firstMessageEditing.value) firstMessageDraft.value = value;
    },
  });

  async function loadPrompt() {
    const aziendaAtStart = selectedAzienda?.value ?? null;
    promptError.value = '';
    try {
      const params = {
        fields: ['id', 'testo_prompt', 'primo_messaggio', 'azienda'],
        limit: 1,
      };

      if (aziendaAtStart) {
        params.filter = { azienda: { _eq: aziendaAtStart } };
      }

      const res = await api.get('/items/prompt', { params });
      if (selectedAzienda?.value !== aziendaAtStart) return;

      const item = res?.data?.data?.[0];
      if (!item) {
        if (aziendaAtStart) {
          try {
            const newPrompt = await api.post('/items/prompt', {
              azienda: aziendaAtStart,
              testo_prompt: '',
              primo_messaggio: '',
            });
            if (selectedAzienda?.value !== aziendaAtStart) return;
            promptId.value = newPrompt?.data?.data?.id;
            promptValue.value = '';
            firstMessageValue.value = '';
            promptDraft.value = '';
            firstMessageDraft.value = '';
            return;
          } catch (createError) {
            if (selectedAzienda?.value !== aziendaAtStart) return;
            promptError.value = `Errore durante la creazione del prompt per l'azienda "${aziendaAtStart}"`;
            return;
          }
        } else {
          promptError.value = 'Prompt non disponibile';
          return;
        }
      }
      if (selectedAzienda?.value !== aziendaAtStart) return;
      promptId.value = item.id;
      promptValue.value = item.testo_prompt || '';
      firstMessageValue.value = item.primo_messaggio || '';
      promptDraft.value = promptValue.value;
      firstMessageDraft.value = firstMessageValue.value;
    } catch (e) {
      if (selectedAzienda?.value !== aziendaAtStart) return;
      promptError.value = 'Errore caricamento prompt';
    }
  }

  function startPromptEdit() {
    if (promptEditing.value || firstMessageEditing.value) return;
    promptError.value = '';
    promptDraft.value = promptValue.value;
    promptEditing.value = true;
  }

  function startFirstMessageEdit() {
    if (promptEditing.value || firstMessageEditing.value) return;
    promptError.value = '';
    firstMessageDraft.value = firstMessageValue.value;
    firstMessageEditing.value = true;
  }

  function cancelPromptEdit() {
    promptDraft.value = promptValue.value;
    promptEditing.value = false;
  }

  function cancelFirstMessageEdit() {
    firstMessageDraft.value = firstMessageValue.value;
    firstMessageEditing.value = false;
  }

  async function savePrompt() {
    if (!promptEditing.value || promptSaving.value) return;
    if (!promptId.value) {
      promptError.value = 'Prompt non disponibile';
      return;
    }
    promptSaving.value = true;
    promptError.value = '';
    try {
      const payload = {
        testo_prompt: promptDraft.value,
      };
      
      // Assicura che l'azienda sia salvata se selezionata
      if (selectedAzienda?.value) {
        payload.azienda = selectedAzienda.value;
      }
      
      await api.patch(`/items/prompt/${promptId.value}`, payload);
      promptValue.value = promptDraft.value;
      promptEditing.value = false;
    } catch (e) {
      promptError.value = 'Errore durante il salvataggio del prompt';
    } finally {
      promptSaving.value = false;
    }
  }

  async function saveFirstMessage() {
    if (!firstMessageEditing.value || firstMessageSaving.value) return;
    if (!promptId.value) {
      promptError.value = 'Prompt non disponibile';
      return;
    }
    firstMessageSaving.value = true;
    promptError.value = '';
    try {
      const payload = {
        primo_messaggio: firstMessageDraft.value,
      };
      
      // Assicura che l'azienda sia salvata se selezionata
      if (selectedAzienda?.value) {
        payload.azienda = selectedAzienda.value;
      }
      
      await api.patch(`/items/prompt/${promptId.value}`, payload);
      firstMessageValue.value = firstMessageDraft.value;
      firstMessageEditing.value = false;
    } catch (e) {
      promptError.value = 'Errore durante il salvataggio del primo messaggio';
    } finally {
      firstMessageSaving.value = false;
    }
  }

  return {
    promptId,
    promptValue,
    promptDraft,
    firstMessageValue,
    firstMessageDraft,
    promptEditing,
    firstMessageEditing,
    promptSaving,
    firstMessageSaving,
    promptError,
    promptDisplay,
    firstMessageDisplay,
    loadPrompt,
    startPromptEdit,
    startFirstMessageEdit,
    cancelPromptEdit,
    cancelFirstMessageEdit,
    savePrompt,
    saveFirstMessage,
  };
}
