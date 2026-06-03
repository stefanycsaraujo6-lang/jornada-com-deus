import { api } from "./convexApi.js";
import { convex } from "./convexClient.js";
import { validateJcdUser, bumpLocalProfileEdited } from "./profileSync.js";
import { normalizeStatus, readStoredStatus } from "./planAccess.js";

const LS_USER = "jcd_user";
const LS_SYNC = "jcd_profile_sync";

function storeGet(ls, key, fallback = null) {
  try {
    return ls.get(key, fallback);
  } catch {
    return fallback;
  }
}

function storeSet(ls, key, value) {
  try {
    ls.set(key, value);
  } catch {
    // ignore
  }
}

function parseLocalEditedTs(sync) {
  const iso = sync?.localEditedAt;
  if (!iso || typeof iso !== "string") return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Sincroniza jcd_user com Convex (profiles). Offline-first: localStorage continua
 * fonte imediata da UI; Convex replica perfil entre dispositivos.
 */
export async function syncJcdUserWithConvex(ls) {
  if (!convex) {
    return { ok: true, skipped: true, user: validateJcdUser(storeGet(ls, LS_USER)), message: null };
  }

  const local = validateJcdUser(storeGet(ls, LS_USER));
  if (!local) {
    return { ok: true, skipped: true, user: null, message: null };
  }

  const sync = storeGet(ls, LS_SYNC, {}) || {};
  const localEditedTs = parseLocalEditedTs(sync);
  const lastConvexRemoteTs = Number(sync.lastConvexUpdatedAt) || 0;

  try {
    const remote = await convex.query(api.users.getByEmail, { email: local.email });
    const status = normalizeStatus(readStoredStatus(ls));

    if (!remote) {
      await convex.mutation(api.profiles.upsert, {
        email: local.email,
        displayName: local.name,
        plan: status === "OURO" ? "gold" : "basic"
      });
      const now = Date.now();
      storeSet(ls, LS_SYNC, { ...sync, lastConvexUpdatedAt: now });
      return { ok: true, user: local, source: "push", message: null };
    }

    const remoteTs = Number(remote.updatedAt) || 0;
    const remoteIsNewer =
      remoteTs > localEditedTs || (remoteTs === localEditedTs && remoteTs > lastConvexRemoteTs);

    if (remoteIsNewer) {
      const merged = validateJcdUser({
        name: String(remote.displayName || "").trim() || local.name,
        email: local.email
      });
      if (merged) {
        storeSet(ls, LS_USER, merged);
        storeSet(ls, LS_SYNC, { ...sync, lastConvexUpdatedAt: remoteTs });
        return { ok: true, user: merged, source: "remote", message: null };
      }
    }

    const localIsNewerOrEqual = localEditedTs >= remoteTs;
    if (localIsNewerOrEqual) {
      await convex.mutation(api.profiles.upsert, {
        email: local.email,
        displayName: local.name,
        plan: status === "OURO" ? "gold" : "basic"
      });
      const now = Date.now();
      storeSet(ls, LS_SYNC, { ...sync, lastConvexUpdatedAt: now });
      return { ok: true, user: local, source: "push", message: null };
    }

    return { ok: true, user: local, source: "noop", message: null };
  } catch (error) {
    console.warn("[convexProfileSync]", error?.message || error);
    return {
      ok: false,
      skipped: false,
      user: local,
      message: error?.message || "Nao foi possivel sincronizar com Convex."
    };
  }
}

export { bumpLocalProfileEdited };
