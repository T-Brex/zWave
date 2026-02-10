/**
 * @typedef {Object} ParseInput
 * @property {Uint8Array} data
 * @property {string} [filename]
 * @property {string} [mimeType]
 */

/**
 * Parse PDF to text (requires optional dependency: pdf-parse).
 * @param {ParseInput} input
 * @returns {Promise<string>}
 */
export async function parsePdf(input) {
  let pdfParse;
  try {
    const mod = await import('pdf-parse');
    pdfParse = mod?.default ?? mod;
  } catch (err) {
    throw new Error(
      'PDF parsing requires the optional dependency "pdf-parse". Install it in the relevant extension/package (e.g. `npm i pdf-parse`).'
    );
  }

  // pdf-parse expects Buffer in Node. Buffer is a Uint8Array subclass.
  // eslint-disable-next-line no-undef
  const buffer = typeof Buffer !== 'undefined' ? Buffer.from(input.data) : input.data;
  const result = await pdfParse(buffer);
  return result?.text ?? '';
}

