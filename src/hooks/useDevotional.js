// ── MODIFICAÇÃO: hook de domínio do devocional
// ── DATA: 2026-04-17
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { useState } from "react";
import { getFriendlyAIErrorMessage } from "../services/gemini.js";
import { buildShareText, genDevocional, genVerseImage, shareVerseImage } from "../services/devotional.js";

export function useDevotional({ ls, plan, userName, todayKey, dark, onToast }) {
  const [dev, setDev] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Conectando na rede eterna...");
  const [imgUrl, setImgUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);

  const loadDevotional = async (theme = null) => {
    setImgUrl(null);
    const cacheKey = `jcd_dev_${todayKey}_${plan}${theme ? `_${theme.slice(0, 10)}` : ""}`;
    const cached = ls.get(cacheKey);
    if (cached) {
      setDev(cached);
      return true;
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
      const data = await genDevocional(plan, userName, theme, { todayKey });
      setDev(data);
      ls.set(cacheKey, data);
      return true;
    } catch (e) {
      onToast(getFriendlyAIErrorMessage(e, "Erro ao gerar devocional. Tente novamente."));
      return false;
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  };

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
    generateVerseImage,
    shareImage
  };
}
