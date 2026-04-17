// ── MODIFICAÇÃO: hook de domínio do devocional
// ── DATA: 2026-04-17
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { useState } from "react";
import { getFriendlyAIErrorMessage } from "../services/gemini.js";
import { buildShareText, genDevocional, genVerseImage, shareVerseImage } from "../services/devotional.js";

const DEV_HISTORY_KEY = "jcd_dev_history";
const DEV_HISTORY_MAX = 6;

export function useDevotional({ ls, plan, userName, todayKey, dark, onToast }) {
  const [dev, setDev] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Conectando na rede eterna...");
  const [imgUrl, setImgUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);

  const getVariantKey = (dateKey, themeKey) => `jcd_dev_variant_${dateKey}_${themeKey || "default"}`;

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
    setImgUrl(null);
    const themeSlice = theme ? theme.slice(0, 10) : "";
    const cacheKey = `jcd_dev_${todayKey}_${plan}${themeSlice ? `_${themeSlice}` : ""}`;
    const variantKey = getVariantKey(todayKey, themeSlice);

    if (!forceNew) {
      const cached = ls.get(cacheKey);
      if (cached) {
        setDev(cached);
        return true;
      }
    }

    setLoading(true);
    const msgs = [
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
      const currentVariant = Number(ls.get(variantKey, 0) || 0);
      const nextVariant = forceNew ? currentVariant + 1 : currentVariant;
      const nonce = Math.random().toString(36).slice(2, 10);
      const history = readHistory();
      const data = await genDevocional(plan, userName, theme, {
        todayKey,
        variant: nextVariant,
        nonce,
        history
      });
      ls.set(variantKey, nextVariant);
      ls.set(cacheKey, data);
      pushHistory({ theme: data?.theme, verse: data?.verse, styleLabel: data?.styleLabel });
      setDev(data);
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
