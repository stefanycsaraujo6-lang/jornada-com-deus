// ── MODIFICAÇÃO: hook de domínio de jornadas e desafios
// ── DATA: 2026-04-17
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { useState } from "react";
import { getFriendlyAIErrorMessage } from "../services/gemini.js";
import { genChallenge, genJourney } from "../services/journey.js";

export function useJourney({ userName, onToast }) {
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [journey, setJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

  const loadChallenge = async () => {
    if (challengeLoading) return false;
    setChallengeLoading(true);
    setChallenge(null);
    try {
      const c = await genChallenge(userName);
      if (!c?.days) throw new Error("Resposta inválida");
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
