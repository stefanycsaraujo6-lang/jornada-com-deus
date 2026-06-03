import { ConvexHttpClient } from "convex/browser";
import { api } from "./convexApi.js";
import { convexUrl } from "./convexClient.js";
import { normalizeStatus, saveStatus, isOuro } from "./planAccess.js";
import { getStoredToken } from "./authApi.js";

function getClient() {
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

export async function fetchUserStatus() {
  const token = getStoredToken();
  const client = getClient();
  if (!token || !client) return null;

  try {
    const user = await client.query(api.users.getSession, { token });
    if (!user) return null;
    return normalizeStatus(user.status);
  } catch {
    return null;
  }
}

export async function syncStatusFromBackend(ls) {
  const remote = await fetchUserStatus();
  if (!remote) return null;
  return saveStatus(ls, remote);
}

export async function requestOuroFeature(moduleName) {
  const status = await fetchUserStatus();
  if (!status) return { ok: false, code: "AUTH_REQUIRED" };
  if (!isOuro(status)) return { ok: false, code: "OURO_REQUIRED", status: 403 };
  return { ok: true, module: moduleName };
}

/** @deprecated */
export const fetchUserPlan = fetchUserStatus;
/** @deprecated */
export const syncPlanFromBackend = syncStatusFromBackend;
/** @deprecated */
export const requestGoldFeature = requestOuroFeature;
