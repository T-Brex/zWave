/**
 * Genera src/calendario-assets.js con le immagini Assets/*.jpeg in base64.
 * Eseguire dalla root del modulo: node scripts/embed-calendario-assets.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'Assets');
const outFile = path.join(root, 'src', 'calendario-assets.js');

const files = ['Cal_disponibilita.jpeg', 'Cal_disponibilita2.jpeg'];
const results = [];

for (const name of files) {
  const filePath = path.join(assetsDir, name);
  if (!fs.existsSync(filePath)) {
    console.warn('File non trovato:', filePath);
    results.push("''");
    continue;
  }
  const base64 = fs.readFileSync(filePath).toString('base64');
  results.push(`'data:image/jpeg;base64,${base64}'`);
}

const content = `// Generato da scripts/embed-calendario-assets.js – non modificare a mano
export const assetCalendario1 = ${results[0]};
export const assetCalendario2 = ${results[1]};
`;

fs.writeFileSync(outFile, content, 'utf8');
console.log('Scritto', outFile);
