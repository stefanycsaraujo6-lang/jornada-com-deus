import { supabase } from "./supabase.js";

const LS_USER = "jcd_user";
const LS_SYNC = "jcd_profile_sync";

function storeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function storeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

function parseTs(iso) {
  if (!iso || typeof iso !== "string") return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** @returns {{ name: string, email: string } | null} */
export function validateJcdUser(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  const email = String(raw.email || "").trim().toLowerCase();
  if (!name || !email || !email.includes("@")) return null;
  return { name, email };
}

export function bumpLocalProfileEdited() {
  const sync = storeGet(LS_SYNC, {}) || {};
  storeSet(LS_SYNC, {
    ...sync,
    localEditedAt: new Date().toISOString()
  });
}

function isRelationOrSchemaMissing(error) {
  const code = error?.code;
  const msg = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

function displayNameFromSession(session) {
  const meta = session?.user?.user_metadata || {};
  const raw = meta.full_name || meta.name || meta.display_name || "";
  const name = String(raw).trim();
  if (name) return name;
  const em = String(session?.user?.email || "").trim();
  if (em.includes("@")) return em.split("@")[0] || "Amigo";
  return "Amigo";
}

/**
 * Sincroniza jcd_user (cache local soberano na UI) com public.profiles.
 * Regra: timestamps updated_at / localEditedAt; remoto mais novo puxa; local mais novo ou empate empurra.
 * @returns {Promise<{ ok: boolean, skipped?: boolean, user: object | null, source?: string, message?: string | null }>}
 */
export async function syncJcdUserWithProfiles(session) {
  if (!supabase || !session?.user?.id) {
    return { ok: true, skipped: true, user: null, message: null };
  }

  const uid = session.user.id;
  const authEmail = String(session.user.email || "").trim().toLowerCase();

  let local = validateJcdUser(storeGet(LS_USER));
  const sync = storeGet(LS_SYNC, {}) || {};
  const localEditedTs = parseTs(sync.localEditedAt);
  const lastRemoteTsStored = parseTs(sync.lastRemoteUpdatedAt);

  const { data: row, error: fetchError } = await supabase
    .from("profiles")
    .select("display_name,email,updated_at")
    .eq("id", uid)
    .maybeSingle();

  if (fetchError) {
    if (isRelationOrSchemaMissing(fetchError)) {
      return { ok: true, skipped: true, user: local, message: null };
    }
    return {
      ok: false,
      skipped: false,
      user: local,
      message: fetchError.message || "Nao foi possivel sincronizar o perfil."
    };
  }

  const remoteUpdatedTs = row?.updated_at ? parseTs(row.updated_at) : 0;

  // Primeiro acesso remoto: hidratar local a partir da sessão / linha remota
  if (!local && authEmail) {
    const nameFromRemote = String(row?.display_name || "").trim();
    const name = nameFromRemote || displayNameFromSession(session);
    const email = String(row?.email || authEmail).trim().toLowerCase() || authEmail;
    local = validateJcdUser({ name, email });
    if (local) {
      storeSet(LS_USER, local);
      const now = new Date().toISOString();
      if (!row) {
        const payload = {
          id: uid,
          display_name: local.name,
          email: local.email,
          updated_at: now
        };
        const { error: upErr } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
        if (!upErr) {
          storeSet(LS_SYNC, { ...sync, localEditedAt: now, lastRemoteUpdatedAt: now });
        }
      } else if (row.updated_at) {
        storeSet(LS_SYNC, {
          ...sync,
          localEditedAt: row.updated_at,
          lastRemoteUpdatedAt: row.updated_at
        });
      }
      return { ok: true, user: local, source: "hydrate", message: null };
    }
  }

  if (!local) {
    return { ok: true, skipped: true, user: null, message: null };
  }

  // Conta autenticada é autoridade para e-mail
  const localAligned = authEmail && local.email !== authEmail ? { ...local, email: authEmail } : local;
  if (localAligned !== local) {
    storeSet(LS_USER, localAligned);
    local = localAligned;
  }

  if (!row) {
    const payload = {
      id: uid,
      display_name: local.name,
      email: local.email,
      updated_at: new Date().toISOString()
    };
    const { error: upErr } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (upErr) {
      if (isRelationOrSchemaMissing(upErr)) {
        return { ok: true, skipped: true, user: local, message: null };
      }
      return { ok: false, user: local, message: upErr.message };
    }
    const nextSync = {
      ...sync,
      lastRemoteUpdatedAt: payload.updated_at
    };
    storeSet(LS_SYNC, nextSync);
    return { ok: true, user: local, source: "push", message: null };
  }

  const remoteName = String(row.display_name || "").trim();
  const remoteEmail = String(row.email || "").trim().toLowerCase();

  const remoteIsNewer =
    remoteUpdatedTs > localEditedTs ||
    (remoteUpdatedTs === localEditedTs && remoteUpdatedTs > lastRemoteTsStored);

  if (remoteIsNewer && (remoteName || remoteEmail)) {
    const merged = validateJcdUser({
      name: remoteName || local.name,
      email: remoteEmail || authEmail || local.email
    });
    if (merged) {
      storeSet(LS_USER, merged);
      storeSet(LS_SYNC, {
        ...sync,
        lastRemoteUpdatedAt: row.updated_at
      });
      return { ok: true, user: merged, source: "remote", message: null };
    }
  }

  const localIsNewerOrEqual = localEditedTs >= remoteUpdatedTs;
  if (localIsNewerOrEqual) {
    const payload = {
      id: uid,
      display_name: local.name,
      email: local.email,
      updated_at: new Date().toISOString()
    };
    const { error: upErr } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (upErr) {
      if (isRelationOrSchemaMissing(upErr)) {
        return { ok: true, skipped: true, user: local, message: null };
      }
      return { ok: false, user: local, message: upErr.message };
    }
    storeSet(LS_SYNC, {
      ...sync,
      lastRemoteUpdatedAt: payload.updated_at
    });
    return { ok: true, user: local, source: "push", message: null };
  }

  return { ok: true, user: local, source: "noop", message: null };
}
