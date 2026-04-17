// ── MODIFICAÇÃO: hook de domínio de jornadas e desafios
// ── DATA: 2026-04-17
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { useState } from "react";
import { getFriendlyAIErrorMessage } from "../services/gemini.js";
import { genChallenge, genJourney } from "../services/journey.js";

export function useJourney({ ls, todayKey, userName, onToast }) {
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [journey, setJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

  const getChallengeKey = (dateKey) => `jcd_challenge_v2_${dateKey}`;
  const getVariantKey = (dateKey) => `jcd_challenge_variant_v2_${dateKey}`;
  const CHALLENGE_HISTORY_KEY = "jcd_challenge_history_v2";
  const CHALLENGE_HISTORY_MAX = 5;

  const readChallengeHistory = () => {
    const list = ls?.get(CHALLENGE_HISTORY_KEY);
    return Array.isArray(list) ? list : [];
  };

  const pushChallengeHistory = (entry) => {
    try {
      const prev = readChallengeHistory();
      const next = [...prev, entry].slice(-CHALLENGE_HISTORY_MAX);
      ls?.set(CHALLENGE_HISTORY_KEY, next);
    } catch {
      // ignore
    }
  };

  const loadChallenge = async (forceNew = false) => {
    if (challengeLoading) return false;
    const dayKey = todayKey || new Date().toISOString().slice(0, 10);
    const cacheKey = getChallengeKey(dayKey);
    const variantKey = getVariantKey(dayKey);

    if (!forceNew) {
      const cached = ls?.get(cacheKey);
      if (cached?.days?.length) {
        setChallenge(cached);
        return true;
      }
    }

    setChallengeLoading(true);
    setChallenge(null);
    try {
      const currentVariant = Number(ls?.get(variantKey, 0) || 0);
      const nextVariant = forceNew ? currentVariant + 1 : currentVariant;
      const previousChallenge = forceNew ? ls?.get(cacheKey) : null;
      const nonce = Math.random().toString(36).slice(2, 10);
      const history = readChallengeHistory();
      const c = await genChallenge(userName, {
        todayKey: dayKey,
        variant: nextVariant,
        previousChallenge,
        nonce,
        history
      });
      if (!c?.days) throw new Error("Resposta inválida");
      ls?.set(variantKey, nextVariant);
      ls?.set(cacheKey, c);
      pushChallengeHistory({ title: c?.title, styleLabel: c?.styleLabel });
      setChallenge(c);
      return true;
    } catch (e) {
      onToast(getFriendlyAIErrorMessage(e, "Erro ao gerar desafio. Verifique sua conexão."));
      console.error("[loadChallenge] Falha ao chamar Gemini:", { message: e?.message, stack: e?.stack });
      return false;
    } finally {
      setChallengeLoading(false);
    }
  };

  const loadJourney = async (name) => {
    setJourneyLoading(true);
    try {
      const j = await genJourney(name, userName);
      if (!j?.steps) throw new Error("Resposta inválida");
      setJourney(j);
      return true;
    } catch (e) {
      onToast(getFriendlyAIErrorMessage(e, "Erro ao gerar jornada. Verifique sua conexão."));
      console.error("[loadJourney] Falha ao chamar Gemini:", { message: e?.message, stack: e?.stack });
      return false;
    } finally {
      setJourneyLoading(false);
    }
  };

  return {
    challenge,
    setChallenge,
    challengeLoading,
    journey,
    journeyLoading,
    loadChallenge,
    loadJourney
  };
}
