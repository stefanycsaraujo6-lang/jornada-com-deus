// ── MODIFICAÇÃO: extração de domínio de jornada/desafio
// ── DATA: 2026-04-17
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { requestGemini } from "./gemini.js";

function fallbackChallenge(userName) {
  const name = userName || "você";
  return {
    title: "7 Dias de Proximidade com Deus",
    description: `Um plano simples e profundo para fortalecer sua caminhada com Deus nesta semana, ${name}.`,
    days: [
      { day: 1, task: "Leia Salmo 23 e agradeca a Deus por 3 cuidados que voce ja recebeu." },
      { day: 2, task: "Separe 10 minutos de oração em silencio, apresentando suas maiores preocupacoes." },
      { day: 3, task: "Leia Filipenses 4:6-7 e entregue a Deus algo que tem tirado sua paz." },
      { day: 4, task: "Compartilhe um versiculo com alguem e ore por essa pessoa." },
      { day: 5, task: "Leia Mateus 6:33 e anote uma prioridade espiritual para esta semana." },
      { day: 6, task: "Faça um ato de bondade intencional e dedique isso ao Senhor." },
      { day: 7, task: "Relembre a semana, agradeca a Deus e escreva um testemunho curto." }
    ]
  };
}

function fallbackJourney(name) {
  return {
    title: name,
    description: "Uma jornada em 5 etapas para aprofundar sua fe de forma pratica, constante e transformadora.",
    steps: [
      { step: 1, title: "Comeco com Intencao", preview: "Defina um horario diario de encontro com Deus." },
      { step: 2, title: "Raizes na Palavra", preview: "Leia e medite em textos biblicos curtos todos os dias." },
      { step: 3, title: "Vida de Oracao", preview: "Transforme pedidos e gratidao em um habito espiritual." },
      { step: 4, title: "Fe em Acao", preview: "Pratique pequenos atos de obediencia e amor ao proximo." },
      { step: 5, title: "Perseveranca", preview: "Revise aprendizados e mantenha constancia para os proximos dias." }
    ]
  };
}

async function callAI(prompt) {
  const data = await requestGemini({
    contents: [{ parts: [{ text: prompt }] }]
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function genChallenge(userName) {
  try {
    return await callAI(`Crie um desafio espiritual semanal para ${userName || "um cristão"}. Responda APENAS com JSON válido:\n{"title":"título motivador","description":"2 frases","days":[{"day":1,"task":"tarefa"},{"day":2,"task":"tarefa"},{"day":3,"task":"tarefa"},{"day":4,"task":"tarefa"},{"day":5,"task":"tarefa"},{"day":6,"task":"tarefa"},{"day":7,"task":"tarefa"}]}`);
  } catch {
    return fallbackChallenge(userName);
  }
}

export async function genJourney(name, userName) {
  try {
    return await callAI(`Crie a jornada espiritual "${name}" para ${userName || "um cristão"} com 5 etapas progressivas. Responda APENAS com JSON válido:\n{"title":"${name}","description":"2-3 frases","steps":[{"step":1,"title":"título","preview":"descrição"},{"step":2,"title":"título","preview":"descrição"},{"step":3,"title":"título","preview":"descrição"},{"step":4,"title":"título","preview":"descrição"},{"step":5,"title":"título","preview":"descrição"}]}`);
  } catch {
    return fallbackJourney(name);
  }
}
