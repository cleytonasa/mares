import React, { useState } from 'react';
import { FileText, Copy, Check, Printer, Share2, Anchor, Waves, Wind, ShieldAlert, Sparkles } from 'lucide-react';
import { PortConfig, WeatherData } from '../types/maritime';
import { getTidesForDay } from '../data/tideData2026';
import { calculateCurrentTide, get24hTideCurve } from '../utils/tideCalculations';
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

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const day = selectedDate.getDate();

  const dayTides = getTidesForDay(year, month, day);
  const hourlyCurve = get24hTideCurve(selectedDate, port, 24); // 24 hourly points

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

  // Generate clean WhatsApp message
  const generateWhatsAppText = () => {
    let msg = `🌊 *BOLETIM INFORMATIVO DE MARÉS & BARRAS*\n`;
    msg += `📍 *${port.fullName.toUpperCase()}*\n`;
    msg += `📅 *Data:* ${dateFormatted.toUpperCase()}\n`;
    msg += `🧭 *Posição:* ${port.coordinates.dmsLat} ${port.coordinates.dmsLng}\n`;
    msg += `🌙 *Fase da Lua:* ${getMoonText()}\n\n`;

    msg += `📊 *TÁBUA OFICIAL DHN (PREIA-MAR / BAIXA-MAR):*\n`;
    dayTides.events.forEach((evt) => {
      const typeLabel = evt.type === 'high' ? '🔼 PREIA-MAR' : '🔽 BAIXA-MAR';
      const h = (evt.height * port.heightMultiplier).toFixed(2);
      msg += `• *${evt.time}* - ${typeLabel}: *${h} m*\n`;
    });

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
    msg += `_Emitido pelo Sistema de Controle de Marés de Areia Branca & Macau._`;

    return msg;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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

        <div className="flex items-center gap-2">
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
                INTERSAL • SALA DE OPERAÇÃO • COSTA BRANCA - RN
              </span>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
                INFORMATIVO DIÁRIO DE MARÉS & BARRAS
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {port.fullName} • Carta Náutica {port.chartNumber}
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

        {/* Hourly Progression Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5 font-mono">
            <span>🕒</span>
            2. PROJEÇÃO HORÁRIA CONTÍNUA (ALTURA & LÂMINA D'ÁGUA)
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
              3. METEOROLOGIA & CONDIÇÕES DO MAR
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

        {/* Advisory & Pilotage Footer */}
        <div className="p-4 bg-slate-900 rounded-xl border border-cyan-900/40 text-xs space-y-2">
          <span className="font-bold text-cyan-300 uppercase tracking-wide block">
            4. RECOMENDAÇÕES NÁUTICAS E SEGURANÇA DA NAVEGAÇÃO
          </span>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>Embarcações com calado superior a 2.8m devem planejar a travessia da barra na janela de 1h30min antes a 1h30min após o pico da Preia-mar.</li>
            <li>Atenção à forte correnteza de maré enchente/vazante no alinhamento da Ponta do Upanema e canal de acesso ao TERMISA.</li>
            <li>Comunicação obrigatória via Rádio VHF Marítimo (Canal 16 / Canal 68) com a Praticagem e Estação de Controle.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
