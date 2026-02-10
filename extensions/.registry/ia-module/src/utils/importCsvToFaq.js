import Papa from 'papaparse';

function parseCsvWithDelimiter(file, delimiter) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: delimiter || ',',
      skipEmptyLines: true,
      encoding: 'UTF-8',
      dynamicTyping: false,
      complete: (results) => resolve(results),
      error: (err) => reject(err),
    });
  });
}

function normalizeRows(data) {
  return data.map((row) => {
    const clean = {};
    Object.entries(row).forEach(([key, value]) => {
      if (!key) return;
      const normalizedKey = String(key)
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase();
      clean[normalizedKey] =
        typeof value === 'string'
          ? value.trim()
          : String(value ?? '').trim();
    });
    return clean;
  });
}

export async function importCsvToFaq(api, file, selectedAzienda = null) {
  // Prova prima con virgola, poi con punto e virgola (es. CSV italiani con ;)
  let results = await parseCsvWithDelimiter(file, ',');
  let normalized = normalizeRows(results.data || []);
  let payload = normalized.filter((r) => r.domanda && r.risposta);

  if (!payload.length) {
    results = await parseCsvWithDelimiter(file, ';');
    normalized = normalizeRows(results.data || []);
    payload = normalized.filter((r) => r.domanda && r.risposta);
  }

  if (!results.data?.length) {
    throw new Error('CSV vuoto o non valido');
  }
  if (!payload.length) {
    throw new Error('CSV valido ma senza righe importabili');
  }

  if (selectedAzienda?.selectedAzienda?.value) {
    payload = payload.map((item) => ({
      ...item,
      azienda: selectedAzienda.selectedAzienda.value,
    }));
  }

  await api.post('/items/faq', payload);
  return payload.length;
}
