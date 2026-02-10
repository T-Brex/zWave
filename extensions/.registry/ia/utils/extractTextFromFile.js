import { parsePdf } from './parsers/pdf.js';
import { parseDocx } from './parsers/docx.js';
import { parseExcel } from './parsers/excel.js';
import { parseCsv } from './parsers/csv.js';

/**
 * @typedef {Object} ExtractTextInput
 * @property {Buffer|Uint8Array|ArrayBuffer} data Raw file bytes
 * @property {string} [filename] Original filename (used to infer extension)
 * @property {string} [mimeType] MIME type if available
 */

/**
 * @typedef {Object} ExtractTextOptions
 * @property {number} [maxChars] If provided, truncate the output to this size
 */

/**
 * Convert Buffer/ArrayBuffer/Uint8Array to Uint8Array.
 * @param {Buffer|Uint8Array|ArrayBuffer} data
 * @returns {Uint8Array}
 */
function toUint8Array(data) {
  if (data instanceof Uint8Array) return data;
  // Buffer is also a Uint8Array, but keep this for clarity.
  // eslint-disable-next-line no-undef
  if (typeof Buffer !== 'undefined' && data instanceof Buffer) return new Uint8Array(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  throw new TypeError('extractTextFromFile: "data" must be Buffer, Uint8Array, or ArrayBuffer');
}

/**
 * @param {string|undefined} filename
 * @returns {string} lowercase extension including dot, e.g. ".pdf" or "" if unknown
 */
function getExt(filename) {
  if (!filename) return '';
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return '';
  return filename.slice(idx).toLowerCase();
}

/**
 * Normalize extracted text to a consistent format.
 * @param {string} text
 * @param {ExtractTextOptions} [options]
 * @returns {string}
 */
function normalizeText(text, options) {
  const cleaned = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // collapse whitespace but keep newlines meaningful
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (options?.maxChars && cleaned.length > options.maxChars) {
    return cleaned.slice(0, options.maxChars);
  }

  return cleaned;
}

/**
 * Extract plain text from common file types.
 *
 * Supported:
 * - PDF (.pdf)
 * - Word (.docx)
 * - Excel (.xlsx, .xls)
 * - CSV (.csv)
 *
 * Notes:
 * - Some parsers rely on optional dependencies. If missing, this throws an error
 *   explaining what to install.
 *
 * @param {ExtractTextInput} input
 * @param {ExtractTextOptions} [options]
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(input, options) {
  const bytes = toUint8Array(input?.data);
  const ext = getExt(input?.filename);
  const mime = (input?.mimeType ?? '').toLowerCase();

  let rawText = '';

  if (ext === '.pdf' || mime === 'application/pdf') {
    rawText = await parsePdf({ data: bytes, filename: input?.filename, mimeType: input?.mimeType });
  } else if (
    ext === '.docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    rawText = await parseDocx({ data: bytes, filename: input?.filename, mimeType: input?.mimeType });
  } else if (
    ext === '.xlsx' ||
    ext === '.xls' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  ) {
    rawText = await parseExcel({ data: bytes, filename: input?.filename, mimeType: input?.mimeType });
  } else if (ext === '.csv' || mime === 'text/csv' || mime === 'application/csv') {
    rawText = await parseCsv({ data: bytes, filename: input?.filename, mimeType: input?.mimeType });
  } else {
    const hint = ext ? ` (${ext})` : '';
    throw new Error(
      `extractTextFromFile: unsupported file type${hint}. Supported: pdf, docx, xlsx/xls, csv.`
    );
  }

  return normalizeText(rawText, options);
}

