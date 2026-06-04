import { ConvexHttpClient } from "convex/browser";
import { api } from "./convexApi.js";
import { convexUrl } from "./convexClient.js";
import { getStoredToken } from "./authApi.js";

function mergeHistory(local, remote) {
  const out = { ...(remote && typeof remote === "object" ? remote : {}) };
  if (local && typeof local === "object") {
    for (const [day, done] of Object.entries(local)) {
      if (done) out[day] = true;
    }
  }
  return out;
}

export async function pullProgressFromConvex(ls) {
  const token = getStoredToken();
  const client = convexUrl && token ? new ConvexHttpClient(convexUrl) : null;
  if (!client || !token) return { ok: false, skipped: true };

  try {
    const remote = await client.query(api.progress.getForSession, { token });
    if (!remote) return { ok: true, history: null };

    const local = ls?.get?.("jcd_history", {}) || {};
    const merged = mergeHistory(local, remote.history);
    ls?.set?.("jcd_history", merged);

    if (typeof remote.pointsWeek === "number") {
      ls?.set?.("jcd_pts_week", remote.pointsWeek);
    }
    if (typeof remote.pointsTotal === "number") {
      ls?.set?.("jcd_pts_total", remote.pointsTotal);
    }

    return { ok: true, history: merged };
  } catch (err) {
    return { ok: false, message: err?.message || "Falha ao carregar progresso." };
  }
}

export async function pushProgressToConvex(ls) {
  const token = getStoredToken();
  const client = convexUrl && token ? new ConvexHttpClient(convexUrl) : null;
  if (!client || !token) return { ok: false, skipped: true };

  try {
    const history = ls?.get?.("jcd_history", {}) || {};
    const pointsWeek = ls?.get?.("jcd_pts_week", 0);
    const pointsTotal = ls?.get?.("jcd_pts_total", 0);

    await client.mutation(api.progress.saveForSession, {
      token,
      history,
      pointsWeek: Number(pointsWeek) || 0,
      pointsTotal: Number(pointsTotal) || 0,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err?.message || "Falha ao salvar progresso." };
  }
}
