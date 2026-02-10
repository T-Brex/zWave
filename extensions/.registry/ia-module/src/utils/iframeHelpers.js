export function injectEmbedStyles(doc, mode) {
  if (!doc) return;

  const id = 'ia-embed-style';
  if (doc.getElementById(id)) return;

  const style = doc.createElement('style');
  style.id = id;
  style.textContent = `
    /* Hide Directus chrome (best-effort; selectors vary by version) */
    .module-bar,
    .module-nav,
    .module-navigation,
    .navigation,
    aside,
    nav,
    [class*="sidebar"],
    [class*="nav-"],
    [class*="module-bar"],
    [class*="module-nav"] {
      display: none !important;
    }

    /* Remove outer paddings/margins */
    html, body, #app {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
    }

    /* Make main content use full width */
    [class*="layout"] {
      grid-template-columns: 1fr !important;
    }

    /* In modal, hide headers/toolbars for a cleaner form */
    ${mode === 'modal' ? `
    header,
    [class*="header"],
    [class*="toolbar"],
    [class*="actions"],
    [class*="title"],
    [class*="breadcrumbs"] {
      display: none !important;
    }` : ''}
  `;
  doc.head?.appendChild(style);
}

export function findSaveButton(doc) {
  if (!doc) return null;
  const buttons = Array.from(doc.querySelectorAll('button'));
  return (
    doc.querySelector('button[aria-label="Salva"]') ||
    doc.querySelector('button[aria-label="Save"]') ||
    buttons.find((b) => /salva|save/i.test(b.getAttribute('aria-label') || '')) ||
    buttons.find((b) => /salva|save/i.test(b.getAttribute('title') || '')) ||
    buttons.find((b) => /salva|save/i.test(b.textContent || '')) ||
    null
  );
}

export function findDeleteButton(doc) {
  const buttons = Array.from(doc.querySelectorAll('button'));
  return (
    doc.querySelector('button[aria-label*="Elimina" i]') ||
    doc.querySelector('button[title*="Elimina" i]') ||
    buttons.find((b) => /elimina|delete/i.test(b.getAttribute('aria-label') || '')) ||
    buttons.find((b) => /elimina|delete/i.test(b.getAttribute('title') || '')) ||
    buttons.find((b) => /elimina|delete/i.test(b.textContent || '')) ||
    null
  );
}

export function findConfirmDeleteButton(doc) {
  const buttons = Array.from(doc.querySelectorAll('button'));
  return buttons.find((b) => /elimina|delete/i.test((b.textContent || '').trim()));
}

export function extractIdFromRow(row) {
  const link = row.querySelector('a[href*="/admin/content/"]');
  const href = link?.getAttribute('href') || '';
  const m = href.match(/\/admin\/content\/[^/]+\/([^/?#]+)/);
  if (m?.[1]) return decodeURIComponent(m[1]);

  const checkbox = row.querySelector('input[type="checkbox"]');
  const val = checkbox?.value;
  if (val && val.length >= 6) return val;
  const dataId = row.getAttribute('data-item-id') || row.getAttribute('data-id');
  if (dataId) return dataId;
  return null;
}

export function scrapeFaqTable(doc) {
  const table = doc.querySelector('table');
  const headerCells = Array.from(table?.querySelectorAll('thead th') || []);
  const headerTexts = headerCells.map((th) => (th.textContent || '').trim().toLowerCase());

  const idxDomanda = headerTexts.findIndex((t) => t.includes('domanda'));
  const idxRisposta = headerTexts.findIndex((t) => t.includes('risposta'));

  const rows = Array.from(doc.querySelectorAll('table tbody tr'));
  if (rows.length === 0) return [];

  return rows.map((tr) => {
    const cells = Array.from(tr.querySelectorAll('td'));
    const id = extractIdFromRow(tr);
    const domanda = idxDomanda >= 0 ? (cells[idxDomanda]?.textContent || '').trim() : (cells[0]?.textContent || '').trim();
    const risposta = idxRisposta >= 0 ? (cells[idxRisposta]?.textContent || '').trim() : (cells[1]?.textContent || '').trim();
    return { id, domanda, risposta };
  });
}

export function findFieldControl(doc, label) {
  const labelLower = label.toLowerCase();

  const byPlaceholder = Array.from(doc.querySelectorAll('input, textarea')).find((el) =>
    String(el.getAttribute('placeholder') || '').toLowerCase().includes(labelLower)
  );
  if (byPlaceholder) return byPlaceholder;

  const byAria = Array.from(doc.querySelectorAll('input, textarea')).find((el) =>
    String(el.getAttribute('aria-label') || '').toLowerCase().includes(labelLower)
  );
  if (byAria) return byAria;

  const labels = Array.from(doc.querySelectorAll('label, [class*="label"], [class*="field-label"]'));
  const labelEl = labels.find((el) => String(el.textContent || '').trim().toLowerCase() === labelLower);
  if (labelEl) {
    const container = labelEl.closest('div') || labelEl.parentElement;
    const inside = container?.querySelector('input, textarea');
    if (inside) return inside;
    const next = container?.nextElementSibling?.querySelector?.('input, textarea');
    if (next) return next;
  }

  return null;
}

export function setNativeInputValue(el, value) {
  if (!el) return;
  el.focus?.();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur?.();
}
