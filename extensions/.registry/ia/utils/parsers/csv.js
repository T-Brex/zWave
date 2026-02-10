/**
 * @typedef {Object} ParseInput
 * @property {Uint8Array} data
 * @property {string} [filename]
 * @property {string} [mimeType]
 */

/**
 * Try to parse CSV using papaparse if available; otherwise fallback to plain text.
 * @param {string} text
 * @returns {Promise<string>}
 */
async function normalizeCsvText(text) {
  try {
    const mod = await import('papaparse');
    const Papa = mod?.default ?? mod;
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    const rows = Array.isArray(parsed?.data) ? parsed.data : [];
    // Convert back to TSV-like text for readability
    return rows
      .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')).join('\t') : String(r ?? '')))
      .join('\n');
  } catch {
    // no papaparse installed -> return raw text
    return text;
  }
}

/**
 * Parse CSV to text.
 * @param {ParseInput} input
 * @returns {Promise<string>}
 */
export async function parseCsv(input) {
  // eslint-disable-next-line no-undef
  const text = typeof TextDecoder !== 'undefined'
    ? new TextDecoder('utf-8', { fatal: false }).decode(input.data)
    : (typeof Buffer !== 'undefined' ? Buffer.from(input.data).toString('utf8') : '');

  return await normalizeCsvText(text);
}

