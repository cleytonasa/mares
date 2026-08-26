import { PortConfig, WeatherData } from '../types/maritime';
import { CurrentTideState } from '../utils/tideCalculations';
import { getTidesForDay } from '../data/tideData2026';
import { SALT_SHIPMENTS_2026, OVERALL_TOTALS, MONTHLY_SALT_SUMMARIES, SaltVesselRecord } from '../data/saltShipmentsData';
import { INITIAL_VESSELS, REGIONAL_POINTS_OF_INTEREST } from '../data/vesselTrafficData';
import { fetchLiveAisVessels, LiveAisVessel } from './vesselAisService';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  contextData?: {
    tideHeight?: number;
    trend?: string;
    windKnots?: number;
    safeDraft?: number;
  };
}

export interface QueryContext {
  port: PortConfig;
  currentTime: Date;
  tideState: CurrentTideState;
  weather: WeatherData | null;
}

/**
 * Remove acentos e normaliza para minúsculas
 */
function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrai data mencionada na pergunta (ex: "dia 25 de agosto", "amanha", "24/08", "proximo sabado")
 */
function extractDateFromQuery(q: string, currentDate: Date): { day: number; month: number; year: number } | null {
  const norm = normalizeStr(q);
  const curYear = currentDate.getFullYear();
  const curMonth = currentDate.getMonth() + 1;
  const curDay = currentDate.getDate();

  // Amanhã
  if (norm.includes('amanha')) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
  }

  // Depois de amanhã
  if (norm.includes('depois de amanha')) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 2);
    return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
  }

  // Ontem
  if (norm.includes('ontem')) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
  }

  // Formato dd/mm ou dd/mm/aaaa
  const slashMatch = norm.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = slashMatch[3] ? (slashMatch[3].length === 2 ? 2000 + parseInt(slashMatch[3], 10) : parseInt(slashMatch[3], 10)) : curYear;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { day, month, year };
    }
  }

  // Formato "dia X de [mes]"
  const monthsMap: Record<string, number> = {
    janeiro: 1, jan: 1,
    fevereiro: 2, fev: 2,
    marco: 3, mar: 3,
    abril: 4, abr: 4,
    maio: 5, mai: 5,
    junho: 6, jun: 6,
    julho: 7, jul: 7,
    agosto: 8, ago: 8,
    setembro: 9, set: 9,
    outubro: 10, out: 10,
    novembro: 11, nov: 11,
    dezembro: 12, dez: 12,
  };

  for (const [mName, mNum] of Object.entries(monthsMap)) {
    const regex = new RegExp(`(?:dia\\s+)?(\\d{1,2})\\s*(?:de\\s+)?${mName}(?:\\s*(?:de\\s+)?(\\d{4}))?`);
    const match = norm.match(regex);
    if (match) {
      const day = parseInt(match[1], 10);
      const year = match[2] ? parseInt(match[2], 10) : curYear;
      if (day >= 1 && day <= 31) {
        return { day, month: mNum, year };
      }
    }
  }

  // Apenas "dia X" (assume mês atual)
  const dayOnlyMatch = norm.match(/\bdia\s+(\d{1,2})\b/);
  if (dayOnlyMatch) {
    const day = parseInt(dayOnlyMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return { day, month: curMonth, year: curYear };
    }
  }

  return null;
}

/**
 * Motor de Respostas Náuticas Especialistas da INTERSAL & Marés
 * Processa perguntas com precisão contextual e dados reais.
 */
export async function processNauticalQuery(
  question: string,
  context: QueryContext
): Promise<string> {
  const q = question.trim();
  const norm = normalizeStr(q);
  const { port, currentTime, tideState, weather } = context;

  const currentHeightStr = tideState.currentHeight.toFixed(2);
  const trendStr = tideState.trendDescription;
  const nextEventTime = tideState.nextEvent.timeStr;
  const nextEventType = tideState.nextEvent.type === 'high' ? 'Preia-mar (Pico Máximo)' : 'Baixa-mar (Mínimo)';
  const nextEventHeight = tideState.nextEvent.height.toFixed(2);
  const nextHighTime = tideState.nextHighEvent.timeStr;
  const nextHighHeight = tideState.nextHighEvent.height.toFixed(2);

  const windKnots = weather ? weather.windSpeedKnots : 14;
  const windGusts = weather ? weather.windGustKnots : 18;
  const windDir = weather ? weather.windDirectionLabel : 'E / SE';
  const windKmH = Math.round(windKnots * 1.852);
  const gustKmH = Math.round(windGusts * 1.852);

  // Simular leve delay de processamento para UX fluida e realista
  await new Promise((resolve) => setTimeout(resolve, 350));

  // =========================================================================
  // 1. PREVISÃO DE NAVIOS / PRÓXIMO NAVIO / LINE-UP / PROGRAMAÇÃO DE EMBARQUES
  // =========================================================================
  const isShipScheduleQuery =
    (norm.includes('proximo navio') ||
     norm.includes('previsao do proximo navio') ||
     norm.includes('data de previsao') ||
     norm.includes('quando chega') ||
     norm.includes('proximos navios') ||
     norm.includes('navios previstos') ||
     norm.includes('escala de navios') ||
     norm.includes('line up') ||
     norm.includes('lineup') ||
     norm.includes('programacao de navios') ||
     norm.includes('proxima atracacao') ||
     norm.includes('proximo carregamento') ||
     (norm.includes('navio') && (norm.includes('previsao') || norm.includes('proximo') || norm.includes('quando') || norm.includes('data') || norm.includes('chegada'))));

  if (isShipScheduleQuery) {
    const plannedVessels = SALT_SHIPMENTS_2026.filter((v) => v.status === 'Previsto');
    const lastConcluded = SALT_SHIPMENTS_2026.filter((v) => v.status === 'Concluído').slice(-2);

    let res = `🚢 **Programação e Previsão de Próximos Navios - INTERSAL (TERMISA):**\n\n`;

    if (plannedVessels.length > 0) {
      res += `📋 **Navios com Escala Prevista (Line-Up Oficial):**\n\n`;
      plannedVessels.forEach((v, idx) => {
        res += `**${idx + 1}. ${v.vesselName}** (${v.trafficLabel} • ${v.shipper})\n` +
          `• **Previsão de Chegada (ETA):** \`${v.eta}h\`\n` +
          `• **Atracação Prevista (ETB):** \`${v.etb}h\`\n` +
          `• **Desatracação Prevista (ETD):** \`${v.etd}h\`\n` +
          `• **Carga:** ${v.totalVolumeTons.toLocaleString('pt-BR')} Tons (${v.scVolumeTons > 0 ? `Sal Comum: ${v.scVolumeTons.toLocaleString('pt-BR')}t` : ''}${v.sqVolumeTons > 0 ? `Sal Químico: ${v.sqVolumeTons.toLocaleString('pt-BR')}t` : ''})\n` +
          `• **Comprimento (LOA) / DWT:** ${v.loaMeters}m | ${v.dwt.toLocaleString('pt-BR')} t\n\n`;
      });
    }

    res += `⚓ **Situação no Cais Agora (AIS em Tempo Real):**\n` +
      `• **No Pier do TERMISA:** **MV PANORMITIS** (Panamax • Carregando 48.000 Tons)\n` +
      `• **No Fundeio Externo:** **MV NORD BALTIC** (Supramax • Aguardando berço)\n\n` +
      `📌 *Dica:* Você pode visualizar todos os 34 embarques do ano e gráficos de produtividade na aba **"Line-Up Sal"** no menu superior.`;

    return res;
  }

  // =========================================================================
  // 2. BUSCA POR NOME DE NAVIO ESPECÍFICO
  // =========================================================================
  const allVesselNames = SALT_SHIPMENTS_2026.map(v => v.vesselName);
  const matchedVessel = SALT_SHIPMENTS_2026.find(v => norm.includes(normalizeStr(v.vesselName)));

  if (matchedVessel) {
    return `🚢 **Ficha do Navio: ${matchedVessel.vesselName}**\n\n` +
      `• **Código da Viagem:** \`${matchedVessel.visitCode}\`\n` +
      `• **Status:** **${matchedVessel.status}** (${matchedVessel.monthName}/2026)\n` +
      `• **Tipo de Tráfego:** ${matchedVessel.trafficLabel} (${matchedVessel.trafficType})\n` +
      `• **Armador/Exportador:** ${matchedVessel.shipper}\n` +
      `• **Volume Embarcado:** **${matchedVessel.totalVolumeTons.toLocaleString('pt-BR')} Toneladas** (${matchedVessel.scVolumeTons > 0 ? `Sal Comum: ${matchedVessel.scVolumeTons.toLocaleString('pt-BR')}t ` : ''}${matchedVessel.sqVolumeTons > 0 ? `Sal Químico: ${matchedVessel.sqVolumeTons.toLocaleString('pt-BR')}t` : ''})\n` +
      `• **Dimensões:** LOA: ${matchedVessel.loaMeters}m | DWT: ${matchedVessel.dwt.toLocaleString('pt-BR')}t\n` +
      `• **Datas Registradas:**\n` +
      `  - ETA: ${matchedVessel.eta}\n` +
      `  - ETB (Atracação): ${matchedVessel.etb}\n` +
      `  - ETD (Saída): ${matchedVessel.etd}`;
  }

  // =========================================================================
  // 3. ESTATÍSTICAS E TOTAIS DE EMBARQUE DE SAL (VOLUMES, SALINOR, SDB)
  // =========================================================================
  if (
    norm.includes('quanto sal') ||
    norm.includes('total de sal') ||
    norm.includes('volume de sal') ||
    norm.includes('toneladas') ||
    norm.includes('estatisticas de embarque') ||
    norm.includes('salinor') ||
    norm.includes('sdb') ||
    norm.includes('exportacao de sal') ||
    norm.includes('cabotagem')
  ) {
    return `🧂 **Balanço Operacional de Embarques de Sal 2026 - INTERSAL:**\n\n` +
      `• **Volume Total Movimentado:** **${OVERALL_TOTALS.totalTons.toLocaleString('pt-BR')} Toneladas**\n` +
      `• **Total de Navios Atendidos:** **${OVERALL_TOTALS.totalVessels} navios** (${OVERALL_TOTALS.concludedVessels} concluídos, ${OVERALL_TOTALS.plannedVessels} previstos)\n` +
      `• **Por Tipo de Sal:**\n` +
      `  - Sal Comum (SC): \`${OVERALL_TOTALS.scTotalTons.toLocaleString('pt-BR')} t\` (${((OVERALL_TOTALS.scTotalTons / OVERALL_TOTALS.totalTons) * 100).toFixed(1)}%)\n` +
      `  - Sal Químico (SQ): \`${OVERALL_TOTALS.sqTotalTons.toLocaleString('pt-BR')} t\` (${((OVERALL_TOTALS.sqTotalTons / OVERALL_TOTALS.totalTons) * 100).toFixed(1)}%)\n` +
      `• **Por Destino:**\n` +
      `  - Exportação (EXP): \`${OVERALL_TOTALS.expTotalTons.toLocaleString('pt-BR')} t\`\n` +
      `  - Cabotagem Nacional (CBT): \`${OVERALL_TOTALS.cbtTotalTons.toLocaleString('pt-BR')} t\`\n` +
      `• **Por Empresa Embarcadora:**\n` +
      `  - SALINOR: \`${OVERALL_TOTALS.salinorTotalTons.toLocaleString('pt-BR')} t\`\n` +
      `  - SDB: \`${OVERALL_TOTALS.sdbTotalTons.toLocaleString('pt-BR')} t\`\n` +
      `• **Média Mensal:** ~${OVERALL_TOTALS.monthlyAverageTons.toLocaleString('pt-BR')} t/mês (Média de ${OVERALL_TOTALS.vesselAverageTons.toLocaleString('pt-BR')} t por navio).`;
  }

  // =========================================================================
  // 4. CONSULTA DE MARÉ EM DATA ESPECÍFICA (EX: "MARÉ DIA 25 DE AGOSTO", "AMANHÃ")
  // =========================================================================
  const extractedDate = extractDateFromQuery(q, currentTime);
  const isTideDateQuery = (norm.includes('mare') || norm.includes('preamar') || norm.includes('baixamar') || norm.includes('tabua') || norm.includes('horario')) && extractedDate !== null;

  if (isTideDateQuery && extractedDate) {
    const { day, month, year } = extractedDate;
    const dayData = getTidesForDay(year, month, day);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dateFormatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

    const eventsList = dayData.events.map((e, idx) => {
      const typeLabel = e.type === 'high' ? '🌊 Preamar (Maré Alta)' : '🏖️ Baixamar (Maré Baixa)';
      return `• **${e.time}h** — **${e.height.toFixed(2)} m** (${typeLabel})`;
    }).join('\n');

    return `📅 **Tábua de Marés DHN para ${dateFormatted} (${day} de ${monthNames[month - 1]}):**\n\n` +
      `📍 **Porto:** ${port.name} (${port.fullName})\n\n` +
      `${eventsList}\n\n` +
      `• **Fase da Lua:** ${dayData.moonPhase}\n` +
      `• **Regime Previsto:** ${dayData.events[0]?.height > 2.5 || (dayData.events[1] && Math.abs(dayData.events[0]?.height - dayData.events[1]?.height) > 2.2) ? 'Maré de Sizígia (Grande Amplitude)' : 'Maré de Quadratura'}\n\n` +
      `*Dados astronômicos oficiais da DHN / Marinha do Brasil.*`;
  }

  // =========================================================================
  // 5. MARÉ ATUAL / AGORA
  // =========================================================================
  if (
    norm.includes('mare agora') ||
    norm.includes('qual a mare') ||
    norm.includes('altura da mare') ||
    norm.includes('mare atual') ||
    norm.includes('como esta a mare') ||
    norm.includes('nivel da mare')
  ) {
    return `🌊 **Situação da Maré em ${port.name} (${port.fullName}):**\n\n` +
      `• **Altura Atual:** \`${currentHeightStr} m\` (sobre o Zero Hidrográfico - ZH)\n` +
      `• **Tendência:** **${trendStr}**\n` +
      `• **Taxa de Variação:** ${Math.abs(tideState.rateOfChangeCmPerHour)} cm/hora\n` +
      `• **Próximo Estofo:** ${nextEventType} às **${nextEventTime}h** com previsão de **${nextEventHeight} m** (em aprox. ${tideState.minutesToNextEvent} min).\n` +
      `• **Regime Atual:** Maré de **${tideState.coefficientType}** (Amplitude: ${tideState.amplitude.toFixed(2)}m).`;
  }

  // =========================================================================
  // 6. ENCHENDO OU VAZANDO / HORÁRIOS DE ESTOFO HOJE
  // =========================================================================
  if (
    norm.includes('enchendo') ||
    norm.includes('vazando') ||
    norm.includes('enchente') ||
    norm.includes('vazante') ||
    norm.includes('tendencia') ||
    norm.includes('horario da mare alta') ||
    norm.includes('horario da mare baixa') ||
    norm.includes('que horas a mare')
  ) {
    const today = new Date();
    const dayTides = getTidesForDay(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const eventsStr = dayTides.events
      .map((e) => `• às **${e.time}h**: **${e.height.toFixed(2)}m** (${e.type === 'high' ? 'Preamar' : 'Baixamar'})`)
      .join('\n');

    return `⚓ **Tendência e Horários das Marés de Hoje (${port.name}):**\n\n` +
      `A maré está atualmente **${tideState.trend}** (\`${currentHeightStr} m\`).\n\n` +
      `📅 **Todos os estofos de hoje (${today.toLocaleDateString('pt-BR')}):**\n${eventsStr}\n\n` +
      `• **Próxima Preamar:** às **${nextHighTime}h** atingindo **${nextHighHeight} m**\n` +
      `• **Velocidade de subida/descida:** ${Math.abs(tideState.rateOfChangeCmPerHour)} cm/hora\n\n` +
      `*Dica operacional:* Para manobras de entrada em canais rasos, a melhor janela é entre 1h30 antes até 30min após o pico da preamar.`;
  }

  // =========================================================================
  // 7. CALADO, PROFUNDIDADE E BANCO DE AREIA
  // =========================================================================
  if (
    norm.includes('calado') ||
    norm.includes('profundidade') ||
    norm.includes('folga') ||
    norm.includes('faq') ||
    norm.includes('banco de areia') ||
    norm.includes('atracar') ||
    norm.includes('navegar com navio')
  ) {
    const canalBase = port.criticalShallowDepth; // ex: 4.0m Areia Branca, 1.5m Macau
    const profundidadeTotal = (canalBase + tideState.currentHeight).toFixed(2);
    const folgaMinima = 0.6; // 60cm de FAQ
    const caladoMaximoSeguro = (parseFloat(profundidadeTotal) - folgaMinima).toFixed(2);

    return `🚢 **Cálculo de Calado e Profundidade Operacional (${port.name}):**\n\n` +
      `• **Profundidade de Carta (ZH no trecho crítico):** \`${canalBase.toFixed(2)} m\`\n` +
      `• **Maré Instantânea:** \`+${currentHeightStr} m\`\n` +
      `• **Lâmina d'Água Total AGORA:** **${profundidadeTotal} m**\n` +
      `• **Folga Abaixo da Quilha (FAQ recomendada):** \`${folgaMinima} m\`\n` +
      `• **Calado Máximo Seguro AGORA:** **${caladoMaximoSeguro} m**\n\n` +
      `📌 *No pico da Preamar (${nextHighTime}h com ${nextHighHeight}m)*, a lâmina d'água atingirá **${(canalBase + parseFloat(nextHighHeight)).toFixed(2)} m**, permitindo calado seguro de até **${(canalBase + parseFloat(nextHighHeight) - folgaMinima).toFixed(2)} m**.`;
  }

  // =========================================================================
  // 8. VENTOS, RAJADAS E CONDIÇÕES METEOROLÓGICAS
  // =========================================================================
  if (
    norm.includes('vento') ||
    norm.includes('rajada') ||
    norm.includes('tempo') ||
    norm.includes('clima') ||
    norm.includes('meteorologia') ||
    norm.includes('onda') ||
    norm.includes('pressao')
  ) {
    const statusVento = windKnots >= 22 ? '⚠️ VENTO FORTE (Atenção redobrada nas manobras de barcaça)' : '✅ Condições favoráveis para navegação';

    return `💨 **Condições Meteorológicas e Marítimas (${port.name}):**\n\n` +
      `• **Velocidade do Vento:** **${windKnots} nós** (${windKmH} km/h)\n` +
      `• **Rajadas Máximas:** **${windGusts} nós** (${gustKmH} km/h)\n` +
      `• **Direção:** ${windDir} (Ventos Alísios de SE/E)\n` +
      `• **Pressão Atmosférica:** ${weather ? weather.pressure : 1012} hPa\n` +
      `• **Altura de Ondas:** ${weather ? weather.waveHeightMeters : 1.2} m\n` +
      `• **Status:** ${statusVento}\n\n` +
      `*Fonte dos dados:* ECMWF / NOAA GFS em tempo real para as coordenadas ${port.coordinates.dmsLat}, ${port.coordinates.dmsLng}.`;
  }

  // =========================================================================
  // 9. EMBARCAÇÕES AIS / SATÉLITE / BARCAÇAS / REBOCADORES / PRATICAGEM
  // =========================================================================
  if (
    norm.includes('barcaca') ||
    norm.includes('rebocador') ||
    norm.includes('praticagem') ||
    norm.includes('lancha') ||
    norm.includes('trafego') ||
    norm.includes('ais') ||
    norm.includes('satelite') ||
    norm.includes('rastreamento') ||
    norm.includes('marinetraffic') ||
    norm.includes('aishub') ||
    norm.includes('vesselfinder') ||
    norm.includes('embarcacoes') ||
    norm.includes('quem esta navegando') ||
    norm.includes('posicao do navio') ||
    norm.includes('onde esta o navio')
  ) {
    const aisData = await fetchLiveAisVessels();
    const liveVessels = aisData.vessels;
    const barcacas = liveVessels.filter(v => v.type === 'barcaca');
    const rebocadores = liveVessels.filter(v => v.type === 'rebocador');
    const navios = liveVessels.filter(v => v.type === 'navio');

    return `🛰️ **Telemetria de Tráfego AIS (Satélite & Estações Costeiras):**\n\n` +
      `📡 **Fonte:** ${aisData.status.sourceName} • *Bacia Potiguar / Costa Branca*\n\n` +
      `🚢 **Navios Graneleiros Monitorados:**\n` +
      navios.map(v => `• **${v.name}** (${v.flag}) — *Vel:* **${v.speedKnots} kt** | *Rumo:* ${v.heading}° | *Dist. TERMISA:* **${v.distanceToTermisaNM ?? '-'} NM** | *Status:* ${v.status} | *ETA:* ${v.eta}`).join('\n') + `\n\n` +
      `⛴️ **Barcaças Salineiras:**\n` +
      barcacas.map(v => `• **${v.name}** — *Vel:* **${v.speedKnots} kt** | *Calado:* ${v.draftMeters}m | *Status:* ${v.status} (${v.cargo || 'Em trânsito'})`).join('\n') + `\n\n` +
      `⚓ **Rebocadores & Praticagem:**\n` +
      rebocadores.map(v => `• **${v.name}** — *Vel:* **${v.speedKnots} kt** | *Status:* ${v.status}`).join('\n') + `\n` +
      `• **LANCHA PRATICAGEM COSTA BRANCA I** — Em prontidão (Canal 16/68 VHF).\n\n` +
      `📌 *Todos os navios com rumo e velocidade instantâneos estão mapeados na aba **"Carta & Mapa"**.*`;
  }

  // =========================================================================
  // 10. TERMISA / TERMINAL SALINEIRO / PORTO-ILHA
  // =========================================================================
  if (
    norm.includes('termisa') ||
    norm.includes('ilha') ||
    norm.includes('porto ilha') ||
    norm.includes('porto-ilha') ||
    norm.includes('intersal')
  ) {
    return `🧂 **Terminal Salineiro de Areia Branca (TERMISA / Porto-Ilha):**\n\n` +
      `• **Localização:** 14 km (7,5 milhas náuticas) ao largo da costa de Areia Branca - RN (${REGIONAL_POINTS_OF_INTEREST[1].dmsLat} ${REGIONAL_POINTS_OF_INTEREST[1].dmsLng}).\n` +
      `• **Estrutura:** Ilha artificial offshore pioneira no mundo, com capacidade de estocagem de sal de ~150.000 toneladas.\n` +
      `• **Profundidade no Berço:** ~15 metros (Zero Hidrográfico), permitindo navios Panamax e Handymax sem restrição severa de maré para atracação no cais externo.\n` +
      `• **Operação:** Barcaças trazem o sal pelas águas abrigadas dos rios durante a preamar e descarregam nos silos do terminal.\n` +
      `• **Sala de Operação INTERSAL:** Coordena tráfego, manobras, tábua de marés, boletins e line-up de navios.`;
  }

  // =========================================================================
  // 11. MACAU / BARRA DE MACAU
  // =========================================================================
  if (norm.includes('macau') || norm.includes('barra de macau')) {
    return `⚓ **Porto e Barra de Macau - RN:**\n\n` +
      `• **Região:** Estuário do Rio Piranhas-Açu com bancos de areia móveis.\n` +
      `• **Profundidade Crítica (ZH):** ~1,5m na barra, exigindo atenção máxima à tábua de marés.\n` +
      `• **Diferença de Maré:** A maré em Macau antecipa em aproximadamente 15 a 20 minutos em relação a Areia Branca.\n` +
      `• **Navegação Segura:** Travessias da barra por barcaças e atuneiros devem ser feitas prioritariamente durante a janela de preamar.`;
  }

  // =========================================================================
  // 12. SIZÍGIA VS QUADRATURA / FASES DA LUA
  // =========================================================================
  if (
    norm.includes('sizigia') ||
    norm.includes('quadratura') ||
    norm.includes('lua') ||
    norm.includes('coeficiente')
  ) {
    return `🌙 **Regimes de Maré: Sizígia vs. Quadratura:**\n\n` +
      `• **Marés de Sizígia (Águas Vivas):** Ocorrem nas fases de **Lua Nova e Lua Cheia**, quando Sol e Lua alinham suas forças gravitacionais. Geram marés muito altas (>2,8m) e baixamares bem secas.\n` +
      `• **Marés de Quadratura (Águas Mortas):** Ocorrem no **Quarto Crescente e Quarto Minguante**, com amplitudes menores (1,5m a 1,8m).\n\n` +
      `Hoje em **${port.name}** o regime está classificado como: **${tideState.coefficientType}** (Amplitude: ${tideState.amplitude.toFixed(2)}m).`;
  }

  // =========================================================================
  // 13. BOLETIM WHATSAPP
  // =========================================================================
  if (norm.includes('boletim') || norm.includes('whatsapp') || norm.includes('relatorio')) {
    return `📲 **Gerador de Boletim Náutico para WhatsApp:**\n\n` +
      `Para gerar o informativo oficial da Sala de Operação e enviar com 1 clique:\n\n` +
      `1. Acesse a aba **"Boletim WhatsApp"** no topo da tela.\n` +
      `2. O sistema formata automaticamente as 4 marés do dia, ventos, status da barra e orientações.\n` +
      `3. Clique no botão verde **"Enviar via WhatsApp"** para disparar aos comandantes e equipes!`;
  }

  // =========================================================================
  // 14. RESPOSTA ESPECÍFICA / DIRECIONADA
  // =========================================================================
  return `⚓ **Assistente Náutico INTERSAL:**\n\n` +
    `Não encontrei uma resposta exata para *" ${question} "*. Posso ajudar com informações precisas sobre:\n\n` +
    `🚢 **Navios & Embarques:** *Previsão de próximos navios (ex: CLIPPER BARI STAR, GANNET BULKER), line-up e volumes de sal.*\n` +
    `🌊 **Marés:** *Maré agora, se está enchendo ou vazando, tábuas de qualquer dia de 2026 e horários de estofo.*\n` +
    `📏 **Calado Seguro:** *Cálculo da lâmina d'água e calado máximo permitido para travessia.*\n` +
    `💨 **Meteorologia:** *Velocidade do vento, rajadas e previsão marítima no TERMISA e Macau.*\n` +
    `📡 **AIS & Tráfego:** *Barcaças, rebocadores e navios na área.*\n\n` +
    `Como posso ajudar você agora?`;
}
