// ── MODIFICACAO: gate do provider Convex com fallback seguro
// ── DATA: 2026-04-28
// ── TASK: Separacao de ambientes Convex
import { ConvexProvider } from "convex/react";
import { convex } from "../services/convexClient.js";

export function ConvexProviderGate({ children }) {
  if (!convex) return children;
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
