/**
 * @typedef {Object} ParseInput
 * @property {Uint8Array} data
 * @property {string} [filename]
 * @property {string} [mimeType]
 */

/**
 * Parse XLSX/XLS to text (requires optional dependency: xlsx).
 * Strategy: convert each sheet to CSV and concatenate.
 *
 * @param {ParseInput} input
 * @returns {Promise<string>}
 */
export async function parseExcel(input) {
  let xlsx;
  try {
    const mod = await import('xlsx');
    xlsx = mod?.default ?? mod;
  } catch (err) {
    throw new Error(
      'Excel parsing requires the optional dependency "xlsx". Install it in the relevant extension/package (e.g. `npm i xlsx`).'
    );
  }

  // eslint-disable-next-line no-undef
  const buffer = typeof Buffer !== 'undefined' ? Buffer.from(input.data) : input.data;
  const workbook = xlsx.read(buffer, { type: 'buffer' });

  const parts = [];
  for (const sheetName of workbook.SheetNames || []) {
    const sheet = workbook.Sheets?.[sheetName];
    if (!sheet) continue;
    const csv = xlsx.utils.sheet_to_csv(sheet, {
      FS: ',',
      RS: '\n',
      strip: true,
      blankrows: false,
    });
    const trimmed = String(csv ?? '').trim();
    if (trimmed) {
      parts.push(`## ${sheetName}\n${trimmed}`);
    }
  }

  return parts.join('\n\n');
}

