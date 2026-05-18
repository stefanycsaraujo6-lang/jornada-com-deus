// ── MODIFICAÇÃO: regeneração inédita via utilitário centralizado
// ── DATA: 2026-05-18
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { useState } from "react";
import {
  buildVersionedCacheKey,
  readVariant,
  requestUniqueGeneration,
  resolveVariant
} from "../services/aiGeneration.js";
import { getFriendlyAIErrorMessage } from "../services/gemini.js";
import { buildShareText, genDevocional, genVerseImage, isSameDevotional, shareVerseImage } from "../services/devotional.js";

const DEV_HISTORY_KEY = "jcd_dev_history_v2";
const DEV_HISTORY_MAX = 6;
const DEV_CACHE_PREFIX = "jcd_dev_v2";
const DEV_VARIANT_PREFIX = "jcd_dev_variant_v2";

function getDevotionalCacheId(todayKey, plan, themeSlice) {
  return `${todayKey}_${plan}${themeSlice ? `_${themeSlice}` : ""}`;
}

function getVariantKey(dateKey, themeKey) {
  return `${DEV_VARIANT_PREFIX}_${dateKey}_${themeKey || "default"}`;
}

export function useDevotional({ ls, plan, userName, todayKey, dark, onToast }) {
  const [dev, setDev] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Conectando na rede eterna...");
  const [imgUrl, setImgUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);

  const pushHistory = (entry) => {
    try {
      const prev = Array.isArray(ls.get(DEV_HISTORY_KEY)) ? ls.get(DEV_HISTORY_KEY) : [];
      const next = [...prev, entry].slice(-DEV_HISTORY_MAX);
      ls.set(DEV_HISTORY_KEY, next);
    } catch {
      // ignore
    }
  };

  const readHistory = () => {
    const list = ls.get(DEV_HISTORY_KEY);
    return Array.isArray(list) ? list : [];
  };

  const runGeneration = async (theme, { forceNew = false } = {}) => {
    if (loading) return false;

    const themeSlice = theme ? theme.slice(0, 10) : "";
    const cacheId = getDevotionalCacheId(todayKey, plan, themeSlice);
    const variantKey = getVariantKey(todayKey, themeSlice);
    const currentVariant = readVariant(ls, variantKey);
    const previousDevotional = forceNew
      ? (dev || ls.get(buildVersionedCacheKey(DEV_CACHE_PREFIX, cacheId, currentVariant)))
      : null;

    const variant = resolveVariant(ls, variantKey, forceNew);
    const cacheKey = buildVersionedCacheKey(DEV_CACHE_PREFIX, cacheId, variant);

    if (forceNew) {
      setDev(null);
      setImgUrl(null);
    } else {
      setImgUrl(null);
    }

    if (!forceNew) {
      const cached = ls.get(cacheKey);
      if (cached) {
        setDev(cached);
        return true;
      }
    }

    setLoading(true);
    const msgs = forceNew
      ? [
          "Preparando um devocional inédito...",
          "Buscando um novo versículo para hoje...",
          "Reescrevendo com um olhar pastoral diferente...",
          "Quase lá — Deus tem uma palavra nova para você..."
        ]
      : [
          "Conectando na rede eterna...",
          "Se conectando com Deus para captar melhor...",
          "Ajustando o coracao na frequencia da graca...",
          "Compilando fe, esperança e direção para hoje..."
        ];
    let mi = 0;
    setLoadMsg(msgs[0]);
    const iv = setInterval(() => {
      mi = (mi + 1) % msgs.length;
      setLoadMsg(msgs[mi]);
    }, 2000);

    try {
      const { data, fromFallback } = await requestUniqueGeneration({
        forceNew,
        previous: previousDevotional,
        isSame: isSameDevotional,
        maxRetriesForceNew: 6,
        generate: (nonce) =>
          genDevocional(plan, userName, theme, {
            todayKey,
            variant,
            nonce,
            history: readHistory(),
            previousDevotional,
            forceNew
          })
      });

      ls.set(cacheKey, data);
      pushHistory({ theme: data?.theme, verse: data?.verse, styleLabel: data?.styleLabel });
      setDev(data);
      if (fromFallback) {
        onToast(
          forceNew
            ? "IA indisponível agora; exibimos uma versão alternativa local."
            : "IA indisponível; exibimos um devocional reserva."
        );
      }
      return true;
    } catch (e) {
      onToast(getFriendlyAIErrorMessage(e, "Erro ao gerar devocional. Tente novamente."));
      return false;
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  };

  const loadDevotional = (theme = null) => runGeneration(theme, { forceNew: false });
  const regenerateDevotional = (theme = null) => runGeneration(theme, { forceNew: true });

  const generateVerseImage = () => {
    if (!dev) return;
    setImgLoading(true);
    setTimeout(() => {
      setImgUrl(genVerseImage(dev.verseText, dev.verse, dev.theme, dark));
      setImgLoading(false);
    }, 700);
  };

  const shareImage = async () => {
    if (!imgUrl) return;
    try {
      const result = await shareVerseImage(imgUrl, todayKey);
      if (result === "downloaded") onToast("Imagem PNG salva nos downloads.");
    } catch {
      onToast("Não foi possível compartilhar a imagem agora.");
    }
  };

  const shareText = buildShareText(dev);

  return {
    dev,
    setDev,
    loading,
    loadMsg,
    imgUrl,
    imgLoading,
    shareText,
    loadDevotional,
    regenerateDevotional,
    generateVerseImage,
    shareImage
  };
}
