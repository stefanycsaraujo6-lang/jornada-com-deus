// ── MODIFICAÇÃO: utilitários centralizados para gerações IA únicas
// ── DATA: 2026-05-18
// ── TASK: TASK-10 (anti-repetição global em devocional, desafio e jornada)

export function slugifyId(value) {
  return (
    String(value || "default")
      .slice(0, 48)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "") || "default"
  );
}

export function buildVersionedCacheKey(prefix, identifier, variant = 0) {
  const base = `${prefix}_${slugifyId(identifier)}`;
  return variant > 0 ? `${base}_v${variant}` : base;
}

export function getGenerationConfig(forceNew = false) {
  return forceNew
    ? { temperature: 1.15, topP: 0.98, topK: 80 }
    : { temperature: 1.0, topP: 0.95, topK: 64 };
}

export function normalizeGenerationResult(result) {
  const fromFallback = Boolean(result?.fromFallback);
  const data = { ...result };
  delete data.fromFallback;
  return { data, fromFallback };
}

export function readVariant(ls, variantKey) {
  return Number(ls?.get(variantKey, 0) || 0);
}

export function resolveVariant(ls, variantKey, forceNew) {
  let variant = readVariant(ls, variantKey);
  if (forceNew) {
    variant += 1;
    ls?.set(variantKey, variant);
  }
  return variant;
}

function hashNonce(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function contentFingerprint(parts) {
  return parts
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join("::");
}

export function readVersionedCaches(prefix, identifier) {
  const slug = slugifyId(identifier);
  const basePrefix = `${prefix}_${slug}`;
  const results = [];
  if (typeof window === "undefined" || !window.localStorage) return results;

  for (const key of Object.keys(window.localStorage)) {
    if (key === basePrefix || key.startsWith(`${basePrefix}_v`)) {
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed) results.push(parsed);
      } catch {
        // ignore invalid cache entries
      }
    }
  }
  return results;
}

export function isDuplicateGeneration(data, previous, { isSame, isSimilar }) {
  if (!previous) return false;
  if (isSame?.(data, previous)) return true;
  if (isSimilar?.(data, previous)) return true;
  return false;
}

export async function requestUniqueGeneration({
  forceNew,
  previous,
  isSame,
  isSimilar,
  generate,
  maxRetries = 2,
  maxRetriesForceNew = 5
}) {
  const limit = forceNew ? maxRetriesForceNew : maxRetries;
  let last = normalizeGenerationResult({});

  for (let attempt = 0; attempt <= limit; attempt += 1) {
    const nonce = `${Math.random().toString(36).slice(2, 10)}_${attempt}`;
    const result = await generate(nonce, attempt > 0);
    last = normalizeGenerationResult(result);
    const { data } = last;

    if (!forceNew || !isDuplicateGeneration(data, previous, { isSame, isSimilar })) {
      return last;
    }
  }

  return last;
}

export function pickDistinctFallback(templates, buildEntry, { variant = 0, nonce = "", isBlocked }) {
  if (!templates.length) return buildEntry(0);
  const start = (Math.abs(Number(variant) || 0) + hashNonce(nonce)) % templates.length;

  for (let offset = 0; offset < templates.length; offset += 1) {
    const entry = buildEntry((start + offset) % templates.length);
    if (!isBlocked?.(entry)) return entry;
  }

  const fallbackIndex = (start + templates.length + 1) % templates.length;
  return buildEntry(fallbackIndex);
}

export function isSameByFields(a, b, fields) {
  if (!a || !b) return false;
  return fields.every((field) => {
    const left = String(a[field] || "").trim().toLowerCase();
    const right = String(b[field] || "").trim().toLowerCase();
    return Boolean(left && right && left === right);
  });
}

export function isSameSteps(a, b) {
  const stepA = a?.steps?.[0];
  const stepB = b?.steps?.[0];
  if (!stepA || !stepB) return false;
  const titleA = String(stepA.title || "").trim().toLowerCase();
  const titleB = String(stepB.title || "").trim().toLowerCase();
  const previewA = String(stepA.preview || "").trim().toLowerCase();
  const previewB = String(stepB.preview || "").trim().toLowerCase();
  return Boolean(titleA && titleB && previewA && previewB && titleA === titleB && previewA === previewB);
}
