/**
 * Utility functions per la gestione delle conversazioni
 */

export function normalizeYesNo(value) {
  return String(value ?? '').trim().toUpperCase();
}

export function normalizeInterest(value) {
  return String(value ?? '').trim().toUpperCase();
}

export function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDuration(minutes) {
  const num = Number(minutes);
  if (!Number.isFinite(num) || num <= 0) return 'N/A';

  const totalSeconds = Math.round(num);
  const hours = Math.floor(totalSeconds / 60);
  const mins = totalSeconds % 60;

  if (totalSeconds < 1) {
    return `${Math.round(60 * num)}s`;
  }

  if (hours === 0) {
    return `${mins}min`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}min`;
}

export function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function getPreviewText(conversation, getField) {
  const riassunto = getField(conversation, 'riassunto');
  if (riassunto) {
    const text = String(riassunto);
    return text.substring(0, 60) + (text.length > 60 ? '...' : '');
  }
  const trascrizione = getField(conversation, 'trascrizione');
  if (trascrizione) {
    const text = String(trascrizione);
    return text.substring(0, 60) + (text.length > 60 ? '...' : '');
  }
  return 'Nessun contenuto';
}

export function parseTranscription(transcription) {
  if (!transcription) return [];

  const messages = [];
  const lines = transcription.split(/\n+/).filter(l => l.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const userPattern = /^(cliente|utente|user|👤)[:\-]?\s*(.+)$/i;
    const aiPattern = /^(ai|assistente|🤖|keplero|bot)[:\-]?\s*(.+)$/i;

    const userMatch = trimmed.match(userPattern);
    const aiMatch = trimmed.match(aiPattern);

    if (userMatch) {
      messages.push({
        type: 'user',
        text: userMatch[2] || userMatch[1],
        time: null
      });
    } else if (aiMatch) {
      messages.push({
        type: 'ai',
        text: aiMatch[2] || aiMatch[1],
        time: null
      });
    } else if (messages.length > 0) {
      // Alternate if no prefix
      const lastType = messages[messages.length - 1].type;
      messages.push({
        type: lastType === 'user' ? 'ai' : 'user',
        text: trimmed,
        time: null
      });
    } else {
      messages.push({
        type: 'user',
        text: trimmed,
        time: null
      });
    }
  }

  return messages;
}

export function parseNotes(notes) {
  if (!notes) return [];
  return String(notes)
    .split(/\n+/)
    .map(n => n.trim())
    .filter(n => n.length > 0);
}

export function getFieldNames(aziendaField) {
  return {
    nome: 'nome',
    telefono: 'telefono',
    email: 'email',
    interesse: 'interesse',
    prenotazione_effettuata: 'prenotazione_effettuata',
    data_prenotazione: 'data_prenotazione',
    codice_riferimento: 'codice_riferimento',
    link_immobile_prenotato: 'link_immobile_prenotato',
    info_immobile: 'info_immobile',
    chiamata_spam: 'chiamata_spam',
    trascrizione: 'trascrizione',
    riassunto: 'riassunto',
    audio_file: 'audio_file',
    note_aggiuntive: 'note_aggiuntive',
    tags: 'tags',
    tag: 'tag',
    durata_minuti: 'durata_minuti',
    date_created: 'date_created',
    azienda: aziendaField || 'azienda'
  };
}

export function getField(record, fieldName, fieldNames) {
  const fields = fieldNames || getFieldNames();
  const field = fields[fieldName];
  return field ? record?.[field] : null;
}
