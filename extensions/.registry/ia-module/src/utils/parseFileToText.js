import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export async function parseFileToText(file) {
  const mime = file.type;
  const buffer = await file.arrayBuffer();

  // CSV
  if (mime === 'text/csv') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    return parsed.data.flat().join('\n');
  }

  // XLS / XLSX
  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  ) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_txt(sheet);
  }

  throw new Error('Tipo file non supportato');
}

