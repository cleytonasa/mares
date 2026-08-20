import React, { useState } from 'react';
import { FileText, Copy, Check, Printer, Waves, Wind, Ship, Share2 } from 'lucide-react';
import { PortConfig, WeatherData } from '../types/maritime';
import { getTidesForDay } from '../data/tideData2026';
import { calculateCurrentTide, get24hTideCurve, getNextHighTide } from '../utils/tideCalculations';
import { getSavedAnnotations, generateShareableFleetUrl } from '../services/annotationService';
import { formatBargeTime, formatBargeDate, parseBargeDateTime } from '../utils/dateUtils';
import { IntersalLogo } from './IntersalLogo';

interface InformativoGeneratorProps {
  port: PortConfig;
  selectedDate: Date;
  weather: WeatherData | null;
  currentTime: Date;
}

export const InformativoGenerator: React.FC<InformativoGeneratorProps> = ({
  port,
  selectedDate,
  weather,
  currentTime,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const day = selectedDate.getDate();
  const targetDateStr = formatBargeDate(selectedDate);

  const dayTides = getTidesForDay(year, month, day);
  const hourlyCurve = get24hTideCurve(selectedDate, port, 24); // 24 hourly points

  // Load scheduled barge operations for the day and port
  const allAnnotations = getSavedAnnotations();
  const dayAnnotations = allAnnotations
    .filter((a) => {
      if (a.portId !== port.id) return false;
      return formatBargeDate(a.dateTime) === targetDateStr;
    })
    .sort((a, b) => {
      const tA = parseBargeDateTime(a.dateTime).getTime();
      const tB = parseBargeDateTime(b.dateTime).getTime();
      return tA - tB;
    });

  const dateFormatted = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const getMoonText = () => {
    switch (dayTides.moonPhase) {
      case 'full':
        return 'Lua Cheia (Sizígia Máxima)';
      case 'new':
        return 'Lua Nova (Sizígia)';
      case 'first_quarter':
        return 'Quarto Crescente (Quadratura)';
      case 'last_quarter':
        return 'Quarto Minguante (Quadratura)';
      default:
        return 'Lua Intermediária';
    }
  };

  // Generate clean WhatsApp message with exact operator barge maneuver times & share link
  const generateWhatsAppText = () => {
    let msg = `🌊 *BOLETIM INFORMATIVO DE MARÉS*\n`;
    msg += `📍 *${port.fullName.toUpperCase()}*\n`;
    msg += `📅 *Data:* ${dateFormatted.toUpperCase()}\n`;
    msg += `🧭 *Posição:* ${port.coordinates.dmsLat} ${port.coordinates.dmsLng}\n`;
    msg += `🌙 *Fase da Lua:* ${getMoonText()}\n\n`;

    msg += `📊 *PREVISÃO DE MARÉS (PREIA-MAR / BAIXA-MAR):*\n`;
    dayTides.events.forEach((evt) => {
      const typeLabel = evt.type === 'high' ? '🔼 PREIA-MAR' : '🔽 BAIXA-MAR';
      const h = (evt.height * port.heightMultiplier).toFixed(2);
      msg += `• *${evt.time}* - ${typeLabel}: *${h} m*\n`;
    });

    if (dayAnnotations.length > 0) {
      msg += `\n🚢 *PROGRAMAÇÃO DE BARCAÇAS & OPERAÇÕES:*\n`;
      dayAnnotations.forEach((ann) => {
        const timeStr = formatBargeTime(ann.dateTime);
        const dt = parseBargeDateTime(ann.dateTime);
        const nextHigh = getNextHighTide(dt, port);
        const icon = ann.category === 'barcaca' ? '⛴️' : ann.category === 'navio' ? '🚢' : '⚓';
        const statusEmoji = ann.bargeStatus === 'Finalizada' ? '🟢' : ann.bargeStatus === 'Operação de Descarga' ? '🟣' : '🔴';

        msg += `• ${icon} *${ann.title}* (${timeStr} BRT)\n`;
        if (ann.bargeStatus) {
          msg += `  - Status: ${statusEmoji} *${ann.bargeStatus}*\n`;
        }
        msg += `  - Próxima Preamar: *🔼 ${nextHigh.timeStr} (${nextHigh.height.toFixed(2)} m)*\n`;
        if (ann.notes && ann.notes.trim()) {
          msg += `  - Obs: _${ann.notes.trim()}_\n`;
        }
      });
    }

    if (weather) {
      msg += `\n💨 *METEOROLOGIA & MAR:*\n`;
      msg += `• Vento: *${weather.windSpeedKnots} nós* (${weather.windDirectionLabel}) • Rajadas: *${weather.windGustKnots} nós*\n`;
      msg += `• Ondulação: *${weather.waveHeightMeters} m* (Período ${weather.wavePeriodSeconds}s)\n`;
      msg += `• Pressão: *${weather.pressure} hPa* • Temp: *${weather.temperature}°C*\n`;
      msg += `• Alvorada Náutica: *${weather.nauticalDawn}* | Crepúsculo: *${weather.nauticalDusk}*\n`;
    }

    msg += `\n⚓ *CONDIÇÃO DA BARRA & RECOMENDAÇÕES:*\n`;
    msg += `• Calado máximo seguro na maré cheia: *~${(port.criticalShallowDepth + 3.2).toFixed(1)} m*\n`;
    msg += `• Atenção ao banco arenoso da Ponta do Upanema / Foz do Rio Açu.\n`;
    msg += `• Contato Praticagem / Controle: Canal VHF 16 / 68.\n\n`;

    const shareUrl = generateShareableFleetUrl(allAnnotations);
    if (shareUrl) {
      msg += `📱 *Acompanhamento em Tempo Real:* ${shareUrl}\n\n`;
    }

    msg += `_Emitido pelo Sistema Informativo de Marés de Areia Branca & Macau._`;

    return msg;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyLink = () => {
    const shareUrl = generateShareableFleetUrl(allAnnotations);
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 text-slate-100">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Boletim Informativo de Marés e Condições Portuárias
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Documento pronto para despacho marítimo, práticos e rádio VHF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
              copiedLink
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Copiar link com a programação das barcaças para acesso externo"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-cyan-400" />}
            {copiedLink ? 'Link Copiado!' : 'Copiar Link c/ Barcaças'}
          </button>

          <button
            onClick={handleCopyWhatsApp}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-700/30'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado para WhatsApp!' : 'Copiar Texto p/ WhatsApp'}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-md shadow-cyan-600/30 transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Printable Bulletin Document Container */}
      <div
        id="printable-maritime-bulletin"
        className="bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl text-slate-200 space-y-6"
      >
        {/* Document Header */}
        <div className="border-b-2 border-emerald-500/40 pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white p-0.5 border-2 border-emerald-600/40 flex items-center justify-center shrink-0 shadow-md">
              <IntersalLogo className="w-full h-full" />
            </div>
            <div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-emerald-400 font-bold block">
                INTERSAL • SALA DE OPERAÇÃO
              </span>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
                INFORMATIVO DIÁRIO DE MARÉS
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {port.chartNumber}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-right font-mono text-xs">
            <span className="text-slate-400 block font-sans text-[10px] uppercase">Data de Referência</span>
            <span className="text-sm font-bold text-white capitalize">{dateFormatted}</span>
            <span className="text-[11px] text-cyan-400 block mt-0.5 font-bold">{getMoonText()}</span>
          </div>
        </div>

        {/* Geographic & Port Header Data */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div>
            <span className="text-[10px] uppercase text-slate-400 block">Latitude / Longitude</span>
            <span className="font-bold text-white">{port.coordinates.dmsLat} {port.coordinates.dmsLng}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block">Nível Médio (NM)</span>
            <span className="font-bold text-white">{port.meanLevel} metros</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block">Fuso Horário</span>
            <span className="font-bold text-white">UTC-03:00 (Brasília)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block">Banco da Barra (ZH)</span>
            <span className="font-bold text-cyan-300">{port.criticalShallowDepth} metros</span>
          </div>
        </div>

        {/* Tides Extremum Highlights */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5 font-mono">
            <Waves className="w-4 h-4" />
            1. PONTOS EXTREMOS DA MARÉ (DHN OFICIAL)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dayTides.events.map((evt, idx) => {
              const adjustedH = (evt.height * port.heightMultiplier).toFixed(2);
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border font-mono ${
                    evt.type === 'high'
                      ? 'bg-cyan-950/40 border-cyan-700/60'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold block ${
                      evt.type === 'high' ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    {evt.type === 'high' ? '▲ PREIA-MAR' : '▼ BAIXA-MAR'} #{idx + 1}
                  </span>
                  <span className="text-xl font-black text-white block mt-0.5">{evt.time}</span>
                  <span className="text-sm font-bold text-emerald-400">{adjustedH} metros</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Programação de Barcaças e Operações Náuticas */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5 font-mono">
            <Ship className="w-4 h-4" />
            2. PROGRAMAÇÃO DE BARCAÇAS & MANOBRAS OPERACIONAIS
          </h3>

          {dayAnnotations.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400">
              Nenhuma manobra de barcaça programada para esta data ({dateFormatted}).
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Embarcação</th>
                    <th className="p-2.5">Horário da Manobra</th>
                    <th className="p-2.5">Status Operacional</th>
                    <th className="p-2.5">Próxima Preamar</th>
                    <th className="p-2.5">Observações / VHF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {dayAnnotations.map((ann) => {
                    const timeStr = formatBargeTime(ann.dateTime);
                    const dt = parseBargeDateTime(ann.dateTime);
                    const nextHigh = getNextHighTide(dt, port);
                    const itemColor = ann.color || '#38bdf8';

                    return (
                      <tr key={ann.id} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-bold text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                          <span>{ann.category === 'barcaca' ? '⛴️' : '🚢'} {ann.title}</span>
                        </td>
                        <td className="p-2.5 text-cyan-300 font-bold">{timeStr} BRT</td>
                        <td className="p-2.5">
                          {ann.bargeStatus ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                ann.bargeStatus === 'Finalizada'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                  : ann.bargeStatus === 'Operação de Descarga'
                                  ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                                  : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                              }`}
                            >
                              {ann.bargeStatus === 'Finalizada' && '🟢 '}
                              {ann.bargeStatus === 'Operação de Descarga' && '🟣 '}
                              {ann.bargeStatus === 'No largo / Aguardando' && '🔴 '}
                              {ann.bargeStatus}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-emerald-300 font-bold font-mono">
                          🔼 Preamar {nextHigh.timeStr} ({nextHigh.height.toFixed(2)} m)
                        </td>
                        <td className="p-2.5 text-slate-300 italic text-[11px]">
                          {ann.notes && ann.notes.trim() ? ann.notes : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Hourly Progression Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5 font-mono">
            <span>🕒</span>
            3. PROJEÇÃO HORÁRIA CONTÍNUA (ALTURA & LÂMINA D'ÁGUA)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Hora (BRT)</th>
                  <th className="p-2.5">Altura Maré (m)</th>
                  <th className="p-2.5">Lâmina na Barra (m)</th>
                  <th className="p-2.5">Condição de Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {hourlyCurve.slice(0, 24).map((pt, idx) => {
                  const isHigh = pt.height >= 2.5;
                  const isLow = pt.height < 1.0;
                  return (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="p-2.5 font-bold text-white">{pt.time}</td>
                      <td className="p-2.5 text-cyan-300 font-bold">{pt.height.toFixed(2)} m</td>
                      <td className="p-2.5 text-emerald-300 font-bold">{pt.depth.toFixed(2)} m</td>
                      <td className="p-2.5">
                        {isHigh ? (
                          <span className="text-emerald-400 font-bold">🟢 Barra Livre (Calado Alto)</span>
                        ) : isLow ? (
                          <span className="text-rose-400 font-bold">🔴 Atenção / Baixa-mar</span>
                        ) : (
                          <span className="text-amber-300">🟡 Calado Moderado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Meteorological Section */}
        {weather && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5 font-mono">
              <Wind className="w-4 h-4" />
              4. METEOROLOGIA & CONDIÇÕES DO MAR
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-mono bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Vento Médio</span>
                <span className="font-bold text-white">{weather.windSpeedKnots} nós ({weather.windDirectionLabel})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Rajadas</span>
                <span className="font-bold text-amber-300">{weather.windGustKnots} nós</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Ondulação / Swell</span>
                <span className="font-bold text-cyan-300">{weather.waveHeightMeters}m ({weather.wavePeriodSeconds}s)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Pressão</span>
                <span className="font-bold text-white">{weather.pressure} hPa</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Alvorada / Crepúsculo</span>
                <span className="font-bold text-white">{weather.nauticalDawn} / {weather.nauticalDusk}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Visibilidade</span>
                <span className="font-bold text-emerald-400">{weather.visibilityKm} km</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


