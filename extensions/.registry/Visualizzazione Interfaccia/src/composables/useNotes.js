import { ref, computed } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { parseNotes } from '../utils/conversationUtils';

const COLLECTION_NAME = 'Chiamate';

export function useNotes(activeConversation, fieldNames) {
  const api = useApi();
  const newMessage = ref('');
  const sendingMessage = ref(false);
  const editingNoteIndex = ref(null);
  const editingNoteText = ref('');
  const savingNote = ref(false);
  const showDeleteNoteDialog = ref(false);
  const noteToDelete = ref(null);
  const error = ref(null);

  const parsedNotes = computed(() => {
    if (!activeConversation.value) return [];
    const notesField = fieldNames.value?.note_aggiuntive || 'note_aggiuntive';
    const notes = activeConversation.value[notesField];
    return parseNotes(notes);
  });

  async function sendMessage() {
    if (!newMessage.value.trim() || !activeConversation.value?.id || sendingMessage.value) return;

    const messageText = newMessage.value.trim();
    sendingMessage.value = true;

    try {
      const notesField = fieldNames.value?.note_aggiuntive || 'note_aggiuntive';
      const currentNotes = activeConversation.value[notesField] || '';
      const newNotes = currentNotes ? `${currentNotes}\n\n${messageText}` : messageText;

      await api.patch(`/items/${COLLECTION_NAME}/${activeConversation.value.id}`, {
        [notesField]: newNotes
      });

      newMessage.value = '';
      activeConversation.value[notesField] = newNotes;
    } catch (err) {
      console.error('Errore nell\'aggiunta della nota:', err);
      const status = err.response?.status;
      if (status === 403) {
        error.value = 'Accesso negato. Non hai i permessi per modificare i record.';
      } else if (status === 404) {
        error.value = 'Record non trovato. Potrebbe essere stato eliminato.';
      } else {
        error.value = `Errore nell'aggiunta della nota: ${err.message || 'Errore sconosciuto'}`;
      }
    } finally {
      sendingMessage.value = false;
    }
  }

  function startEditNote(index) {
    editingNoteIndex.value = index;
    editingNoteText.value = parsedNotes.value[index];
  }

  function cancelEditNote() {
    editingNoteIndex.value = null;
    editingNoteText.value = '';
  }

  async function saveEditedNote(newText) {
    if (!newText || !newText.trim() || savingNote.value || !activeConversation.value?.id) return;
    if (editingNoteIndex.value === null) return;

    savingNote.value = true;
    try {
      const notesField = fieldNames.value?.note_aggiuntive || 'note_aggiuntive';
      const notes = [...parsedNotes.value];
      notes[editingNoteIndex.value] = String(newText).trim();
      const newNotes = notes.join('\n\n');

      await api.patch(`/items/${COLLECTION_NAME}/${activeConversation.value.id}`, {
        [notesField]: newNotes
      });

      activeConversation.value[notesField] = newNotes;
      cancelEditNote();
    } catch (err) {
      console.error('Errore nella modifica della nota:', err);
      const status = err.response?.status;
      if (status === 403) {
        error.value = 'Accesso negato. Non hai i permessi per modificare i record.';
      } else if (status === 404) {
        error.value = 'Record non trovato. Potrebbe essere stato eliminato.';
      } else {
        error.value = `Errore nella modifica della nota: ${err.message || 'Errore sconosciuto'}`;
      }
    } finally {
      savingNote.value = false;
    }
  }

  function deleteNote(index) {
    noteToDelete.value = index;
    showDeleteNoteDialog.value = true;
  }

  function cancelDeleteNote() {
    showDeleteNoteDialog.value = false;
    noteToDelete.value = null;
  }

  async function confirmDeleteNote() {
    if (noteToDelete.value === null || savingNote.value || !activeConversation.value?.id) return;

    const index = noteToDelete.value;
    savingNote.value = true;

    try {
      const notesField = fieldNames.value?.note_aggiuntive || 'note_aggiuntive';
      const notes = [...parsedNotes.value];
      notes.splice(index, 1);
      const newNotes = notes.length > 0 ? notes.join('\n\n') : '';

      await api.patch(`/items/${COLLECTION_NAME}/${activeConversation.value.id}`, {
        [notesField]: newNotes
      });

      activeConversation.value[notesField] = newNotes;
      cancelDeleteNote();
    } catch (err) {
      console.error('Errore nell\'eliminazione della nota:', err);
      const status = err.response?.status;
      if (status === 403) {
        error.value = 'Accesso negato. Non hai i permessi per modificare i record.';
      } else if (status === 404) {
        error.value = 'Record non trovato. Potrebbe essere stato eliminato.';
      } else {
        error.value = `Errore nell'eliminazione della nota: ${err.message || 'Errore sconosciuto'}`;
      }
      cancelDeleteNote();
    } finally {
      savingNote.value = false;
    }
  }

  return {
    newMessage,
    sendingMessage,
    editingNoteIndex,
    editingNoteText,
    savingNote,
    showDeleteNoteDialog,
    noteToDelete,
    parsedNotes,
    error,
    sendMessage,
    startEditNote,
    cancelEditNote,
    saveEditedNote,
    deleteNote,
    cancelDeleteNote,
    confirmDeleteNote
  };
}
