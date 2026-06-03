/**
 * Catálogo de jornadas temáticas intensas — cada trilha com tópicos e foco pastoral específicos.
 */
export const JOURNEY_CATALOG = [
  {
    id: "ansiedade-e-paz",
    title: "Ansiedade e Paz que Excede",
    subtitle: "Quando a mente não para e o coração precisa descansar em Deus",
    topics: [
      "Identificar gatilhos de ansiedade sem culpa",
      "Entregar o controle com oração estruturada",
      "Práticas de presença e respiração com Deus",
      "Renovar a mente com promessas específicas",
      "Viver o dia presente com confiança prática"
    ],
    intensity: "alta"
  },
  {
    id: "cura-de-feridas",
    title: "Cura de Feridas do Passado",
    subtitle: "Processar mágoas, perdas e traumas à luz do evangelho",
    topics: [
      "Nomear a dor com honestidade diante de Deus",
      "Perdão progressivo (não forçado)",
      "Quebrar ciclos de autossabotagem",
      "Restaurar identidade em Cristo",
      "Testemunho de libertação e recomeço"
    ],
    intensity: "alta"
  },
  {
    id: "proposito-e-chamado",
    title: "Propósito e Chamado",
    subtitle: "Clareza espiritual para decisões de vida e ministério",
    topics: [
      "Mapear dons e limitações reais",
      "Discernir voz de Deus vs. pressão externa",
      "Alinhar rotina com missão",
      "Coragem para obedecer em passos pequenos",
      "Compromisso de 30 dias com accountability"
    ],
    intensity: "alta"
  },
  {
    id: "casamento-e-familia",
    title: "Casamento e Família Restaurados",
    subtitle: "Reconciliação, comunicação e cobertura espiritual do lar",
    topics: [
      "Diagnóstico amoroso do relacionamento",
      "Linguagens de amor na prática diária",
      "Perdão conjugal e limites saudáveis",
      "Oração intercessória pela família",
      "Rituais de bênção no lar"
    ],
    intensity: "alta"
  },
  {
    id: "financas-e-provisao",
    title: "Finanças e Providência Divina",
    subtitle: "Mordomia, contentamento e confiança na provisão de Deus",
    topics: [
      "Examinar medos financeiros à luz da Bíblia",
      "Generosidade com sabedoria",
      "Planejamento sem ansiedade",
      "Renunciar à idolatria do consumo",
      "Gratidão e oferta como ato de fé"
    ],
    intensity: "alta"
  },
  {
    id: "libertacao-e-quebra",
    title: "Libertação e Quebra de Barreiras",
    subtitle: "Confrontar fortalezas espirituais com autoridade em Cristo",
    topics: [
      "Reconhecer padrões de opressão espiritual",
      "Renúncia específica e confissão",
      "Clamar pela libertação com a Palavra",
      "Encher o vazio com presença de Deus",
      "Caminhar em liberdade sustentada"
    ],
    intensity: "muito alta"
  },
  {
    id: "jejum-e-consagracao",
    title: "Jejum e Consagração",
    subtitle: "Protocolo guiado de jejum bíblico com segurança pastoral",
    topics: [
      "Tipos de jejum e quando usar cada um",
      "Preparação física e espiritual",
      "Guerra contra distrações",
      "Ouvir Deus no silêncio prolongado",
      "Quebra de jugos e consagração final"
    ],
    intensity: "muito alta"
  },
  {
    id: "mulheres-da-fe",
    title: "Mulheres da Fé Hoje",
    subtitle: "Identidade, força e ternura à luz de mulheres bíblicas",
    topics: [
      "Herança espiritual feminina",
      "Coragem como Débora, ternura como Maria",
      "Limites e autoridade saudável",
      "Cura da comparação e rejeição",
      "Enviar como discípula missionária"
    ],
    intensity: "alta"
  }
];

export const FASTING_PROTOCOLS = [
  {
    id: "daniel-21",
    title: "Jejum de Daniel — 21 dias",
    focus: "Clareza, disciplina e ouvir a voz de Deus",
    days: 21
  },
  {
    id: "eliseu-7",
    title: "Jejum de Eliseu — 7 dias",
    focus: "Romper bloqueios e receber direção urgente",
    days: 7
  },
  {
    id: "consagracao-3",
    title: "Consagração expressa — 3 dias",
    focus: "Reinício espiritual com jejum parcial guiado",
    days: 3
  }
];

export function getJourneyByTitle(title) {
  return JOURNEY_CATALOG.find((j) => j.title === title) || null;
}

export function getJourneyCatalogTitles() {
  return JOURNEY_CATALOG.map((j) => j.title);
}
