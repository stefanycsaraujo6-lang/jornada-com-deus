// ── MODIFICACAO: cliente Convex com ambiente Dev/Prod seguro
// ── DATA: 2026-04-28
// ── TASK: Separacao de ambientes Convex
import { ConvexReactClient } from "convex/react";

function isValidConvexUrl(value) {
  const normalized = String(value || "").trim();
  return /^https:\/\/[a-z0-9-]+\.convex\.cloud$/i.test(normalized);
}

function readConvexUrlFromEnv() {
  const explicitUrl = import.meta.env.VITE_CONVEX_URL;
  const devUrl = import.meta.env.VITE_CONVEX_URL_DEV;
  const prodUrl = import.meta.env.VITE_CONVEX_URL_PROD;
  const mode = import.meta.env.PROD ? "prod" : "dev";

  const selectedUrl = explicitUrl || (mode === "prod" ? prodUrl : devUrl);
  const normalized = String(selectedUrl || "").trim();

  if (!normalized) {
    console.warn(
      `[convex] URL nao configurada para ${mode}. Defina VITE_CONVEX_URL_${mode === "prod" ? "PROD" : "DEV"} ou VITE_CONVEX_URL.`
    );
    return null;
  }

  if (!isValidConvexUrl(normalized)) {
    console.warn("[convex] URL invalida. Use formato https://<deployment>.convex.cloud.");
    return null;
  }

  return normalized;
}

const convexUrl = readConvexUrlFromEnv();
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export { convex, convexUrl };
