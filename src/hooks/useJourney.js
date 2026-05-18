// ── MODIFICAÇÃO: desafios sem repetição com bloqueio de caches e fingerprint
// ── DATA: 2026-05-18
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { useState } from "react";
import {
  buildVersionedCacheKey,
  readVariant,
  readVersionedCaches,
  requestUniqueGeneration,
  resolveVariant,
  slugifyId
} from "../services/aiGeneration.js";
import { getFriendlyAIErrorMessage } from "../services/gemini.js";
import {
  challengeFingerprint,
  genChallenge,
  genJourney,
  isSameChallenge,
  isSameJourney,
  isSimilarChallenge
} from "../services/journey.js";

const CHALLENGE_CACHE_PREFIX = "jcd_challenge_v3";
const CHALLENGE_VARIANT_PREFIX = "jcd_challenge_variant_v3";
const CHALLENGE_HISTORY_KEY = "jcd_challenge_history_v3";
const CHALLENGE_HISTORY_MAX = 8;

const JOURNEY_CACHE_PREFIX = "jcd_journey_v2";
const JOURNEY_VARIANT_PREFIX = "jcd_journey_variant_v2";
const JOURNEY_HISTORY_KEY = "jcd_journey_history_v2";
const JOURNEY_HISTORY_MAX = 8;

function getChallengeVariantKey(dayKey) {
  return `${CHALLENGE_VARIANT_PREFIX}_${dayKey}`;
}

function getJourneyVariantKey(journeyName) {
  return `${JOURNEY_VARIANT_PREFIX}_${slugifyId(journeyName)}`;
}

export function useJourney({ ls, todayKey, userName, onToast }) {
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [journey, setJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [activeJourneyName, setActiveJourneyName] = useState(null);

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

  const readJourneyHistory = () => {
    const list = ls?.get(JOURNEY_HISTORY_KEY);
    return Array.isArray(list) ? list : [];
  };

  const pushJourneyHistory = (entry) => {
    try {
      const prev = readJourneyHistory();
      const next = [...prev, entry].slice(-JOURNEY_HISTORY_MAX);
      ls?.set(JOURNEY_HISTORY_KEY, next);
    } catch {
      // ignore
    }
  };

  const loadChallenge = async (forceNew = false) => {
    if (challengeLoading) return false;
    const dayKey = todayKey || new Date().toISOString().split(0, 10);
    const variantKey = getChallengeVariantKey(dayKey);
    const currentVariant = readVariant(ls, variantKey);
    const blockedChallenges = readVersionedCaches(CHALLENGE_CACHE_PREFIX, dayKey);
    const previousChallenge = forceNew
      ? (challenge || ls?.get(buildVersionedCacheKey(CHALLENGE_CACHE_PREFIX, dayKey, currentVariant)))
      : null;

    const variant = resolveVariant(ls, variantKey, forceNew);
    const cacheKey = buildVersionedCacheKey(CHALLENGE_CACHE_PREFIX, dayKey, variant);

    if (forceNew) setChallenge(null);

    if (!forceNew) {
      const cached = ls?.get(cacheKey);
      if (cached?.days?.length) {
        setChallenge(cached);
        return true;
      }
    }

    setChallengeLoading(true);
    if (!forceNew) setChallenge(null);

    try {
      const { data, fromFallback } = await requestUniqueGeneration({
        forceNew,
        previous: previousChallenge,
        isSame: isSameChallenge,
        isSimilar: isSimilarChallenge,
        maxRetriesForceNew: 6,
        generate: (nonce) =>
          genChallenge(userName, {
            todayKey: dayKey,
            variant,
            previousChallenge,
            blockedChallenges,
            nonce,
            history: readChallengeHistory(),
            forceNew
          })
      });

      if (!data?.days) throw new Error("Resposta inválida");
      ls?.set(cacheKey, data);
      pushChallengeHistory({
        title: data?.title,
        styleLabel: data?.styleLabel,
        firstTask: data?.days?.[0]?.task,
        fingerprint: challengeFingerprint(data)
      });
      setChallenge(data);
      if (fromFallback) {
        onToast(
          forceNew
            ? "IA indisponível agora; exibimos um desafio alternativo local."
            : "IA indisponível; exibimos um desafio reserva."
        );
      }
      return true;
    } catch (e) {
      onToast(getFriendlyAIErrorMessage(e, "Erro ao gerar desafio. Verifique sua conexão."));
      console.error("[loadChallenge] Falha ao chamar Gemini:", { message: e?.message, stack: e?.stack });
      return false;
    } finally {
      setChallengeLoading(false);
    }
  };

  const regenerateChallenge = () => loadChallenge(true);

  const loadJourney = async (name, forceNew = false) => {
    if (!name || journeyLoading) return false;

    setActiveJourneyName(name);
    const variantKey = getJourneyVariantKey(name);
    const currentVariant = readVariant(ls, variantKey);
    const previousJourney = forceNew
      ? (journey || ls?.get(buildVersionedCacheKey(JOURNEY_CACHE_PREFIX, name, currentVariant)))
      : null;

    const variant = resolveVariant(ls, variantKey, forceNew);
    const cacheKey = buildVersionedCacheKey(JOURNEY_CACHE_PREFIX, name, variant);

    if (forceNew) setJourney(null);

    if (!forceNew) {
      const cached = ls?.get(cacheKey);
      if (cached?.steps?.length) {
        setJourney(cached);
        return true;
      }
    }

    setJourneyLoading(true);

    try {
      const { data, fromFallback } = await requestUniqueGeneration({
        forceNew,
        previous: previousJourney,
        isSame: isSameJourney,
        generate: (nonce) =>
          genJourney(name, userName, {
            variant,
            nonce,
            history: readJourneyHistory(),
            previousJourney,
            forceNew
          })
      });

      if (!data?.steps?.length) throw new Error("Resposta inválida");
      ls?.set(cacheKey, data);
      pushJourneyHistory({
        journeyName: name,
        firstStepTitle: data?.steps?.[0]?.title,
        styleLabel: data?.styleLabel
      });
      setJourney(data);
      if (fromFallback) {
        onToast(
          forceNew
            ? "IA indisponível agora; exibimos uma jornada alternativa local."
            : "IA indisponível; exibimos uma jornada reserva."
        );
      }
      return true;
    } catch (e) {
      onToast(getFriendlyAIErrorMessage(e, "Erro ao gerar jornada. Verifique sua conexão."));
      console.error("[loadJourney] Falha ao chamar Gemini:", { message: e?.message, stack: e?.stack });
      return false;
    } finally {
      setJourneyLoading(false);
    }
  };

  const regenerateJourney = () => {
    if (!activeJourneyName) return Promise.resolve(false);
    return loadJourney(activeJourneyName, true);
  };

  return {
    challenge,
    setChallenge,
    challengeLoading,
    journey,
    journeyLoading,
    activeJourneyName,
    loadChallenge,
    regenerateChallenge,
    loadJourney,
    regenerateJourney
  };
}
