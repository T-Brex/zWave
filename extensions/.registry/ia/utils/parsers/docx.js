/**
 * @typedef {Object} ParseInput
 * @property {Uint8Array} data
 * @property {string} [filename]
 * @property {string} [mimeType]
 */

/**
 * Parse DOCX to text (requires optional dependency: mammoth).
 * @param {ParseInput} input
 * @returns {Promise<string>}
 */
export async function parseDocx(input) {
  let mammoth;
  try {
    const mod = await import('mammoth');
    mammoth = mod?.default ?? mod;
  } catch (err) {
    throw new Error(
      'DOCX parsing requires the optional dependency "mammoth". Install it in the relevant extension/package (e.g. `npm i mammoth`).'
    );
  }

  // mammoth expects an ArrayBuffer (or Buffer in some environments).
  const arrayBuffer =
    input.data.buffer.slice(input.data.byteOffset, input.data.byteOffset + input.data.byteLength);

  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value ?? '';
}

