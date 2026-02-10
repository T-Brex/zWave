export function normalizeKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function keyVariants(preferredKey) {
  const raw = String(preferredKey || '').trim();
  const norm = normalizeKey(raw);
  const variants = new Set([
    raw,
    raw.toLowerCase(),
    raw.toUpperCase(),
    norm,
    norm.toLowerCase(),
    norm.toUpperCase(),
    norm.replace(/_/g, '-'),
    norm.replace(/-/g, '_'),
  ]);
  return Array.from(variants).filter(Boolean);
}

export async function probeCollectionKey(api, key) {
  try {
    await api.get(`/items/${key}`, { params: { limit: 1, fields: ['id'] } });
    return true;
  } catch (e) {
    const status = e?.response?.status;
    if (status === 403 || status === 404) return false;
    return false;
  }
}

let collectionsIndex = null;

export async function ensureCollectionsIndex(api) {
  if (collectionsIndex) return;
  try {
    const response = await api.get('/collections');
    collectionsIndex = response?.data?.data || [];
  } catch (e) {
    collectionsIndex = [];
  }
}

export async function resolveCollectionKey(api, preferredKey) {
  await ensureCollectionsIndex(api);
  const list = collectionsIndex || [];
  const preferred = normalizeKey(preferredKey);
  const direct = list.find((c) => normalizeKey(c?.collection) === preferred);
  if (direct?.collection) return direct.collection;

  const byName = list.find((c) => normalizeKey(c?.meta?.name) === preferred);
  const candidate = byName?.collection || preferredKey;

  for (const k of keyVariants(candidate)) {
    if (await probeCollectionKey(api, k)) return k;
  }

  return candidate;
}
