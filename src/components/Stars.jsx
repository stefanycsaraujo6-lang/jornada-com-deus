// ── MODIFICAÇÃO: extrair componente de estrelas e orbes do App.jsx
// ── DATA: 2026-04-16
// ── TASK: BL-01 (refatorar App.jsx em componentes menores)
import { useRef } from "react";

export function Stars({ dark }) {
  const stars = useRef(
    [...Array(45)].map(() => ({
      l: Math.random() * 100,
      t: Math.random() * 100,
      s: 1 + Math.random() * 1.8,
      d: Math.random() * 5,
      dur: 2.5 + Math.random() * 3,
    }))
  ).current;

  if (!dark) return null;

  return (
    <div className="stars">
      {stars.map((s, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${s.l}%`,
            top: `${s.t}%`,
            width: s.s,
            height: s.s,
            animationDelay: `${s.d}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
      <div className="orb orb1" />
      <div className="orb orb2" />
    </div>
  );
}

