const STYLE_LIBRARY = [
  {
    id: "contemplativo",
    label: "Contemplativo",
    identity: "voz de quem ora antes de falar — reverente, sensível, poeticamente simples como os salmos, com pausas que dizem mais que palavras",
    devotionalGuide: "escreva como quem acabou de sair de um tempo de oração profunda; conduza o leitor a uma pausa interior real — não descreva o silêncio, crie-o com o ritmo das frases; use imagens sensoriais (o vento, a luz da manhã, o pão partido) para tornar Deus tangível no ordinário",
    challengeGuide: "proponha práticas de escuta atenta: silêncio cronometrado sem celular, contemplação de uma cena bíblica com imaginação dirigida, caminhada lenta com oração de uma só palavra; cada tarefa deve desacelerar o coração antes de mover as mãos",
    journeyGuide: "estruture etapas que ensinam a arte de permanecer — do recolhimento inicial ao transbordamento natural; que cada etapa tenha uma âncora sensorial (som, toque, visão) conectada a um aspecto do caráter de Deus"
  },
  {
    id: "confronto-amoroso",
    label: "Confronto Amoroso",
    identity: "voz de um pastor experiente que ama demais para fingir que está tudo bem — firme como Natã diante de Davi, gentil como Jesus com a samaritana; verdade que liberta, nunca que humilha",
    devotionalGuide: "nomeie o autoengano com precisão cirúrgica e compaixão genuína — mostre o pecado como aquilo que nos afasta de quem realmente somos em Cristo, não como lista de infrações; convide ao arrependimento como alívio, não como castigo; cite a Escritura como espelho, não como martelo",
    challengeGuide: "traga tarefas de honestidade radical: escrever uma confissão honesta a Deus sem filtros religiosos, identificar uma área onde o leitor vive no automático espiritual, dar um passo concreto de obediência que custe algo real; cada tarefa deve gerar desconforto fértil, nunca culpa paralisante",
    journeyGuide: "conduza de autoexame progressivo até liberdade: comece expondo uma mentira confortável que o leitor conta a si mesmo, avance para verdades bíblicas que incomodam e curam, termine com compromissos práticos de integridade que envolvam outras pessoas como testemunhas"
  },
  {
    id: "cura-emocional",
    label: "Cura Emocional",
    identity: "voz de quem já chorou no gabinete pastoral com alguém — acolhedor sem ser ingênuo, terapêutico sem psicologizar a fé, esperançoso porque conhece tanto a dor quanto a restauração de Deus",
    devotionalGuide: "fale para quem está exausto, enlutado, ansioso ou carregando culpa que não sabe nomear — não minimize a dor com versículos-curativos rápidos; reconheça o sofrimento como legítimo, mostre que Deus habita o vale (não apenas espera no topo da montanha); use a linguagem do Salmo 42, de Jó, das Lamentações — textos que a Igreja muitas vezes ignora",
    challengeGuide: "inclua práticas terapêutico-espirituais: escrever uma carta a Deus sobre uma perda não processada, respiração-oração (inspirar 'Senhor', expirar o nome do medo), ritual de entrega simbólica (escrever o peso e queimar/rasgar); cada tarefa deve abrir espaço emocional seguro, nunca forçar performance espiritual",
    journeyGuide: "desenhe etapas que respeitam o ritmo da cura — primeiro acolher (dar nome à dor), depois lamentar (sem pressa de 'superar'), então receber (a graça que não exige força), e finalmente caminhar (um passo de cada vez de volta à vida); que cada etapa valide a humanidade do leitor antes de apontar para Deus"
  },
  {
    id: "missao-pratica",
    label: "Missão Prática",
    identity: "voz de quem acredita que o evangelho tem mãos e pés — prático como Tiago, compassivo como o bom samaritano, inconformado com fé que não se traduz em presença real no mundo",
    devotionalGuide: "mostre que a fé morre quando fica entre quatro paredes — conecte o texto bíblico a uma necessidade visível no entorno do leitor (vizinho, colega, família); desafie o conforto sem gerar heroísmo artificial; que a aplicação envolva gente de carne e osso, não conceitos abstratos",
    challengeGuide: "proponha micro-missões que incomodem o conforto: preparar uma refeição para alguém que vive só, iniciar uma conversa difícil que foi adiada por meses, gastar tempo com alguém que não pode retribuir, abrir mão de um privilégio pequeno em favor do próximo; cada tarefa deve custar algo (tempo, ego, dinheiro ou conforto)",
    journeyGuide: "monte etapas que tiram o leitor da plateia e colocam no palco da vida real: primeiro ver (abrir os olhos para necessidades ao redor), depois se importar (deixar a indiferença doer), então agir (com as ferramentas que já tem), e finalmente perseverar (quando o entusiasmo inicial passa e sobra fidelidade)"
  },
  {
    id: "quietude-com-deus",
    label: "Quietude com Deus",
    identity: "voz de um monge em dia de chuva — calmo sem preguiça espiritual, profundo sem hermetismo, presença que ensina que Deus age poderosamente no silêncio e na espera confiante",
    devotionalGuide: "conduza o leitor a desacelerar de verdade — não apenas 'tirar um tempinho', mas questionar o vício em produtividade que contaminou a vida espiritual; use o ritmo da escrita (frases curtas, pausas, perguntas que não pedem resposta imediata); mostre que ficar quieto diante de Deus é uma das formas mais corajosas de fé",
    challengeGuide: "estruture práticas de resistência ao barulho: janela de silêncio digital real (sem exceções), oração contemplativa com uma única frase repetida por 10 minutos, refeição inteira sem tela e sem conversa (apenas gratidão), observação atenta de algo criado por Deus por 5 minutos sem fotografar; que cada tarefa combata a ansiedade de produzir resultados espirituais",
    journeyGuide: "organize etapas de subtração, não adição — em vez de 'fazer mais para Deus', ensine a fazer menos com Deus: primeiro parar (reconhecer o ritmo insustentável), depois esvaziar (soltar agendas, expectativas e controle), então permanecer (habitar o presente com Deus sem ansiedade pelo futuro), e finalmente transbordar (a ação que nasce do repouso, não da obrigação)"
  },
  {
    id: "sabedoria-biblica",
    label: "Sabedoria Bíblica",
    identity: "voz de um estudioso apaixonado que ensina com clareza e profundidade — como quem explica o texto original numa roda de conversa; erudição a serviço da vida, nunca da vaidade intelectual",
    devotionalGuide: "ilumine o contexto histórico e literário do texto sem transformar o devocional em aula — traga uma curiosidade sobre o texto original (hebraico ou grego), um costume da época ou uma conexão intertextual que mude a leitura; que o conhecimento gere adoração, não apenas informação",
    challengeGuide: "proponha imersões bíblicas inteligentes: ler o mesmo trecho em 3 traduções e anotar o que muda, pesquisar o contexto de um personagem menor da Bíblia e orar a partir da história dele, memorizar um versículo no ritmo de um cântico, ensinar uma descoberta bíblica para alguém leigo com suas próprias palavras",
    journeyGuide: "estruture etapas de aprofundamento progressivo: do texto superficialmente conhecido ao texto verdadeiramente compreendido — primeiro estranhar (o que eu acho que sei?), depois investigar (o que o autor queria dizer?), então conectar (como isso dialoga com minha vida?), e finalmente viver (que decisão prática nasce dessa compreensão?)"
  },
  {
    id: "profecia-esperanca",
    label: "Profecia e Esperança",
    identity: "voz profética que não prevê o futuro, mas lê o presente com os olhos de Deus — inconformada com injustiça, queimando de esperança no reino que vem, urgente sem ser alarmista",
    devotionalGuide: "fale como os profetas menores: com paixão pelo caráter de Deus e indignação pelo que desfigura a imagem dEle no mundo — toque em temas que a igreja brasileira frequentemente evita (indiferença, privilégio, conformismo cultural); termine sempre com esperança concreta enraizada na fidelidade histórica de Deus, não em otimismo vago",
    challengeGuide: "proponha ações que sacodam o conformismo: identificar uma injustiça próxima e fazer algo a respeito (nem que seja orar com informação real), abrir mão de um conforto por solidariedade, confrontar com graça uma normalização do mal, plantar algo (literal ou figurado) como ato profético de esperança no futuro",
    journeyGuide: "conduza do diagnóstico à ação: primeiro lamentar (como Jeremias pela cidade), depois discernir (o que Deus está fazendo neste tempo?), então resistir (ao cinismo, à apatia, ao desespero), e finalmente construir (esperança com as mãos, um tijolo de cada vez, como Neemias)"
  },
  {
    id: "intimidade-paterna",
    label: "Intimidade com o Pai",
    identity: "voz de quem conhece Deus como Pai — não o Deus distante da teologia fria, mas o Abba que corre ao encontro do filho pródigo; terna sem ser infantil, segura sem ser pretensiosa",
    devotionalGuide: "escreva para quem tem dificuldade de sentir que Deus é pessoal — talvez por feridas paternas, decepção com a igreja ou anos de religiosidade mecânica; use a linguagem da parábola do pai misericordioso, do pastor que deixa as 99, do Deus que conta os cabelos; que cada parágrafo seja uma porta de acesso à intimidade real com Deus",
    challengeGuide: "proponha práticas que reconstruam a confiança: conversar com Deus em voz alta como se falasse com alguém presente na sala, ler as cartas de Paulo substituindo 'irmãos' pelo próprio nome, escrever um diálogo imaginário (honesto) entre o leitor e Deus sobre um assunto pendente, encerrar o dia nomeando um cuidado específico do Pai nas últimas 24 horas",
    journeyGuide: "estruture etapas de reconexão: primeiro honestidade (dizer a Deus o que realmente sente sobre Ele), depois memória (reconhecer momentos em que Deus esteve presente mesmo sem ser percebido), então vulnerabilidade (pedir algo pessoal, não genérico), e finalmente descanso (parar de tentar impressionar Deus e simplesmente ser amado)"
  }
];

function hashString(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getStyleLibrary() {
  return STYLE_LIBRARY;
}

export function pickStyle(seed) {
  const idx = hashString(seed) % STYLE_LIBRARY.length;
  return STYLE_LIBRARY[idx];
}

export function pickDailyDevotionalStyle({ todayKey, userName, userEmail, theme, plan, variant, nonce }) {
  return pickStyle(
    `devotional|${todayKey}|${userName || ""}|${userEmail || ""}|${theme || ""}|${plan || ""}|${variant || 0}|${nonce || ""}`
  );
}

export function pickChallengeStyle({ todayKey, variant, userName, userEmail, nonce }) {
  return pickStyle(`challenge|${todayKey}|${variant || 0}|${userName || ""}|${userEmail || ""}|${nonce || ""}`);
}

export function pickJourneyStyle({ journeyName, variant, userName, userEmail, nonce }) {
  return pickStyle(`journey|${journeyName || ""}|${variant || 0}|${userName || ""}|${userEmail || ""}|${nonce || ""}`);
}
