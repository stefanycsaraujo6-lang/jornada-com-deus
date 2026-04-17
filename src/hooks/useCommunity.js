// ── MODIFICAÇÃO: hook de domínio para comunidade
// ── DATA: 2026-04-17
// ── TASK: TASK-12 (extração de ranking, propósitos e check-ins)
import { useMemo, useState } from "react";
import { validatePhotoWithAI } from "../services/devotional.js";

const POINTS = { culto: 10, biblia: 5, devocional: 3 };

export function useCommunity({
  ls,
  user,
  streak,
  todayKey,
  mockUsers,
  mockGroup,
  initialPurposes,
  onToast
}) {
  const [commTab, setCommTab] = useState("ranking");
  const [rankScope, setRankScope] = useState("global");
  const [rankPeriod, setRankPeriod] = useState("week");
  const [myPts, setMyPts] = useState(() => ls.get("jcd_pts", { week: 0, total: 0 }));
  const [todayCheckins, setTodayCheckins] = useState(() => ls.get(`jcd_checkins_${todayKey}`, {}));
  const [showPhotoModal, setShowPhotoModal] = useState(null);
  const [photoValidating, setPhotoValidating] = useState(false);
  const [photoResult, setPhotoResult] = useState(null);
  const [purposes, setPurposes] = useState(() => ls.get("jcd_purposes", initialPurposes));
  const [activePurpose, setActivePurpose] = useState(null);
  const [showNewPurpose, setShowNewPurpose] = useState(false);
  const [newPurposeForm, setNewPurposeForm] = useState({ name: "", desc: "", deadline: "", has_deadline: false });
  const [joinCode, setJoinCode] = useState("");

  const userAvatar = (user?.name || "EU").slice(0, 2).toUpperCase();
  const userShortName = user?.name?.split(" ")[0] || "Você";

  const displayUsers = useMemo(() => {
    const comparator = (a, b) => rankPeriod === "week" ? b.pts_week - a.pts_week : b.pts_total - a.pts_total;
    const me = { id: 99, name: user?.name || "Você", avatar: userAvatar, pts_week: myPts.week, pts_total: myPts.total, streak, isMe: true };
    const source = rankScope === "global" ? mockUsers : mockGroup;
    return [...source, me].sort(comparator);
  }, [mockUsers, mockGroup, myPts.week, myPts.total, rankPeriod, rankScope, streak, user?.name, userAvatar]);

  const myRank = useMemo(() => displayUsers.findIndex((u) => u.isMe) + 1, [displayUsers]);
  const streakBonus = Math.floor(streak / 7);

  const addPoints = (type) => {
    const total = (POINTS[type] || 0) + streakBonus;
    const updated = { week: myPts.week + total, total: myPts.total + total };
    setMyPts(updated);
    ls.set("jcd_pts", updated);
    const ci = { ...todayCheckins, [type]: true };
    setTodayCheckins(ci);
    ls.set(`jcd_checkins_${todayKey}`, ci);
    return total;
  };

  const handlePhotoSubmit = async (file, type) => {
    setPhotoValidating(true);
    setPhotoResult(null);
    const valid = await validatePhotoWithAI(file, type);
    if (valid) {
      const earned = addPoints(type);
      setPhotoResult({ ok: true, msg: `✓ Validado! +${earned} pontos creditados.` });
    } else {
      setPhotoResult({ ok: false, msg: "Não foi possível confirmar. Envie uma foto mais clara." });
    }
    setPhotoValidating(false);
  };

  const createPurpose = () => {
    if (!newPurposeForm.name.trim()) return;
    const code = `JCD-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const p = {
      id: Date.now(),
      code,
      name: newPurposeForm.name,
      desc: newPurposeForm.desc,
      members: [{ name: userShortName, avatar: userAvatar, days: 1 }],
      days_active: 1,
      deadline: newPurposeForm.has_deadline ? newPurposeForm.deadline : null,
      has_deadline: newPurposeForm.has_deadline
    };
    const updated = [p, ...purposes];
    setPurposes(updated);
    ls.set("jcd_purposes", updated);
    setShowNewPurpose(false);
    setNewPurposeForm({ name: "", desc: "", deadline: "", has_deadline: false });
    onToast(`🕊️ Propósito criado! Código: ${code}`);
  };

  const joinPurpose = () => {
    const found = purposes.find((p) => p.code === joinCode.toUpperCase().trim());
    if (!found) {
      onToast("Código não encontrado.");
      return;
    }
    const me = { name: userShortName, avatar: userAvatar, days: 0 };
    const updated = purposes.map((p) => p.id === found.id ? { ...p, members: [...p.members, me] } : p);
    setPurposes(updated);
    ls.set("jcd_purposes", updated);
    setJoinCode("");
    onToast("🙏 Você entrou no propósito!");
  };

  const resetPhotoModal = () => {
    setShowPhotoModal(null);
    setPhotoResult(null);
  };

  return {
    commTab, setCommTab,
    rankScope, setRankScope,
    rankPeriod, setRankPeriod,
    myPts,
    todayCheckins,
    showPhotoModal, setShowPhotoModal,
    photoValidating,
    photoResult,
    purposes,
    activePurpose, setActivePurpose,
    showNewPurpose, setShowNewPurpose,
    newPurposeForm, setNewPurposeForm,
    joinCode, setJoinCode,
    displayUsers, myRank, streakBonus,
    handlePhotoSubmit,
    createPurpose,
    joinPurpose,
    resetPhotoModal
  };
}
