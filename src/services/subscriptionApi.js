// ── MODIFICAÇÃO: sincronização de plano com backend
// ── DATA: 2026-05-18
import { normalizePlan, savePlan } from "./planAccess.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";

export async function fetchUserPlan(email) {
  const trimmed = String(email || "").trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const response = await fetch(`${API_BASE}/api/me`, {
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": trimmed
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;

    const plan = data?.user?.is_gold ? "gold" : normalizePlan(data?.user?.plan);
    return plan;
  } catch {
    return null;
  }
}

export async function syncPlanFromBackend(ls, email) {
  const remotePlan = await fetchUserPlan(email);
  if (!remotePlan) return null;
  return savePlan(ls, remotePlan);
}

export async function requestGoldFeature(email, moduleName) {
  const trimmed = String(email || "").trim().toLowerCase();
  const routes = {
    journeys: "/api/premium/journeys",
    fasting: "/api/premium/fasting",
    purposes: "/api/premium/purposes"
  };
  const path = routes[moduleName];
  if (!path || !trimmed) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": trimmed
      }
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, ...data };
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }
}
