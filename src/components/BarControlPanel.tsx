import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, AlertTriangle, Ship, Gauge, Navigation, CheckCircle2, XCircle, Clock, Info } from 'lucide-react';
import { PortConfig, VesselParameters, BarStatusType, WeatherData } from '../types/maritime';
import { CurrentTideState, get24hTideCurve } from '../utils/tideCalculations';

interface BarControlPanelProps {
  port: PortConfig;
  tideState: CurrentTideState;
  weather: WeatherData | null;
  currentTime: Date;
  onUpdateDraft?: (draft: number) => void;
}

const PRESET_VESSELS: VesselParameters[] = [
  {
    name: 'Balsa Salineira (Areia Branca / Macau)',
    vesselType: 'salineiro',
    draftMeters: 3.2,
    speedKnots: 7.0,
    squatMarginMeters: 0.25,
    safetyMarginMeters: 0.5,
  },
  {
    name: 'Barco Pesqueiro Oceânico (Atum / Lagosta)',
    vesselType: 'pesqueiro',
    draftMeters: 2.2,
    speedKnots: 8.5,
    squatMarginMeters: 0.2,
    safetyMarginMeters: 0.4,
  },
  {
    name: 'Rebocador de Apoio Portuário',
    vesselType: 'rebocador',
    draftMeters: 3.8,
    speedKnots: 9.0,
    squatMarginMeters: 0.35,
    safetyMarginMeters: 0.6,
  },
  {
    name: 'Lancha de Praticagem / Fiscalização',
    vesselType: 'lancha',
    draftMeters: 1.2,
    speedKnots: 15.0,
    squatMarginMeters: 0.15,
    safetyMarginMeters: 0.3,
  },
  {
    name: 'Navio Graneleiro (TERMISA Offshore)',
    vesselType: 'graneleiro',
    draftMeters: 6.5,
    speedKnots: 6.0,
    squatMarginMeters: 0.4,
    safetyMarginMeters: 0.8,
  },
];

export const BarControlPanel: React.FC<BarControlPanelProps> = ({
  port,
  tideState,
  weather,
  currentTime,
  onUpdateDraft,
}) => {
  const [selectedVessel, setSelectedVessel] = useState<VesselParameters>(PRESET_VESSELS[0]);
  const [customDraft, setCustomDraft] = useState<number>(selectedVessel.draftMeters);
  const [customSpeed, setCustomSpeed] = useState<number>(selectedVessel.speedKnots);
  const [customSafetyMargin, setCustomSafetyMargin] = useState<number>(selectedVessel.safetyMarginMeters);
  const [shallowBankDepth, setShallowBankDepth] = useState<number>(port.criticalShallowDepth);

  // Dynamic squat calculation: Squat (m) ≈ 0.005 * (Speed in knots)^1.8
  const calculatedSquat = Number((0.0045 * Math.pow(customSpeed, 1.85)).toFixed(2));

  // Dynamic Vessel Requirement
  const totalRequiredDepth = Number((customDraft + calculatedSquat + customSafetyMargin).toFixed(2));

  // Current Depth over the bar sandbank = Bank Zero Hydrographic depth + Current Tide Height
  const currentTotalWaterDepth = Number((shallowBankDepth + tideState.currentHeight).toFixed(2));

  // Under Keel Clearance (Folga Abaixo da Quilha - FAQ)
  const underKeelClearance = Number((currentTotalWaterDepth - (customDraft + calculatedSquat)).toFixed(2));
  const effectiveSafetyMargin = Number((underKeelClearance - customSafetyMargin).toFixed(2));

  // Determine status
  let barStatus: BarStatusType = 'OPEN';
  let statusBadge = {
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    title: 'AUTORIZADO / BARRA LIVRE',
    desc: 'Lâmina d\'água suficiente para passagem com folga segura de quilha.',
    icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
  };

  const weatherAlerts: string[] = [];
  if (weather && weather.windSpeedKnots >= 22) {
    weatherAlerts.push(`Vento forte na foz (${weather.windSpeedKnots} nós / ${weather.windDirectionLabel})`);
  }
  if (weather && weather.waveHeightMeters >= 1.8) {
    weatherAlerts.push(`Arrebentação elevada na barra (Ondulação de ${weather.waveHeightMeters}m)`);
  }

  if (underKeelClearance < 0) {
    barStatus = 'CLOSED';
    statusBadge = {
      color: 'bg-rose-950/80 text-rose-300 border-rose-600',
      title: 'TRAVESSIA PROIBIDA / RISCO DE ENCALHE',
      desc: `Falta de calado: Lâmina d'água (${currentTotalWaterDepth}m) é menor que o calado dinâmico (${(customDraft + calculatedSquat).toFixed(2)}m).`,
      icon: <AlertOctagon className="w-6 h-6 text-rose-400 animate-pulse" />,
    };
  } else if (effectiveSafetyMargin < 0) {
    barStatus = 'RESTRICTED';
    statusBadge = {
      color: 'bg-orange-950/80 text-orange-300 border-orange-600',
      title: 'BARRA RESTRITA / MARGEM INSUFICIENTE',
      desc: `Folga de quilha (${underKeelClearance}m) é inferior à margem de segurança recomendada (${customSafetyMargin}m).`,
      icon: <AlertTriangle className="w-6 h-6 text-orange-400" />,
    };
  } else if (underKeelClearance < 0.8 || weatherAlerts.length > 0) {
    barStatus = 'CAUTION';
    statusBadge = {
      color: 'bg-amber-950/80 text-amber-300 border-amber-500',
      title: 'PASSAGEM COM ATENÇÃO / PRATICAGEM',
      desc: 'Calado aceitável, porém com atenção redobrada devido a ventos, correntes de maré ou folga reduzida.',
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    };
  }

  // Calculate Safe Windows for 24h
  const curve = get24hTideCurve(currentTime, port, 48);
  const safeWindows: { start: string; end: string; maxDepth: number }[] = [];
  let inSafe = false;
  let winStart = '';
  let maxD = 0;

  curve.forEach((pt) => {
    const isSafe = pt.depth >= totalRequiredDepth;
    if (isSafe && !inSafe) {
      inSafe = true;
      winStart = pt.time;
      maxD = pt.depth;
    } else if (isSafe && inSafe) {
      if (pt.depth > maxD) maxD = pt.depth;
    } else if (!isSafe && inSafe) {
      inSafe = false;
      safeWindows.push({ start: winStart, end: pt.time, maxDepth: maxD });
    }
  });
  if (inSafe) {
    safeWindows.push({ start: winStart, end: '23:59', maxDepth: maxD });
  }

  const handleSelectPreset = (v: VesselParameters) => {
    setSelectedVessel(v);
    setCustomDraft(v.draftMeters);
    setCustomSpeed(v.speedKnots);
    setCustomSafetyMargin(v.safetyMarginMeters);
    if (onUpdateDraft) onUpdateDraft(v.draftMeters);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner with Decision Status */}
      <div className={`p-5 rounded-2xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${statusBadge.color}`}>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/10 shadow-lg">
            {statusBadge.icon}
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-slate-300 block">
              STATUS OPERACIONAL DA BARRA • {port.name.toUpperCase()}
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mt-0.5">
              {statusBadge.title}
            </h2>
            <p className="text-xs md:text-sm mt-1 text-slate-200">
              {statusBadge.desc}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col items-end gap-2 text-right">
          <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase block font-mono">Folga de Quilha (FAQ)</span>
            <span className={`text-xl font-mono font-bold ${underKeelClearance >= 0.5 ? 'text-emerald-400' : underKeelClearance >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
              {underKeelClearance >= 0 ? `+${underKeelClearance.toFixed(2)} m` : `${underKeelClearance.toFixed(2)} m`}
            </span>
          </div>
        </div>
      </div>

      {/* Weather Warnings if any */}
      {weatherAlerts.length > 0 && (
        <div className="p-3.5 bg-amber-950/40 border border-amber-600/40 rounded-xl flex items-center gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold block">Condições Meteorológicas Adversas na Barra:</span>
            <span>{weatherAlerts.join(' • ')}</span>
          </div>
        </div>
      )}

      {/* Control Grid: Vessel Selection & Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Vessel Preset Selection & Parameter Inputs */}
        <div className="lg:col-span-7 bg-slate-900/90 p-5 md:p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold tracking-wide text-cyan-400 uppercase flex items-center gap-2">
              <Ship className="w-4 h-4" />
              Parâmetros da Embarcação & Hidrografia
            </h3>
            <span className="text-xs text-slate-400 font-mono">Calado Dinâmico</span>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Selecionar Tipo de Embarcação Típica da Região:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_VESSELS.map((v, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectPreset(v)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                    selectedVessel.name === v.name
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-900/30'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <span className="font-bold block">{v.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Calado: {v.draftMeters}m • Vel: {v.speedKnots} nós
                    </span>
                  </div>
                  {selectedVessel.name === v.name && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders and custom numeric inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            {/* Calado Estático */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Calado Estático (T)</span>
                <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                  {customDraft.toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.1"
                value={customDraft}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCustomDraft(val);
                  if (onUpdateDraft) onUpdateDraft(val);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Profundidade máxima submersa do casco parado
              </span>
            </div>

            {/* Velocidade / Efeito Squat */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Velocidade no Canal (V)</span>
                <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                  {customSpeed.toFixed(1)} nós
                </span>
              </div>
              <input
                type="range"
                min="2.0"
                max="18.0"
                step="0.5"
                value={customSpeed}
                onChange={(e) => setCustomSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-cyan-400/80 mt-1 block font-mono">
                Efeito Squat calculado: +{calculatedSquat} m
              </span>
            </div>

            {/* Margem de Segurança / FAQ Requerida */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Margem de Caturro / Onda</span>
                <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                  {customSafetyMargin.toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.2"
                step="0.05"
                value={customSafetyMargin}
                onChange={(e) => setCustomSafetyMargin(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Reserva para balanço e ondulação na entrada da barra
              </span>
            </div>

            {/* Profundidade do Banco de Areia no ZH */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Banco da Barra no ZH</span>
                <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                  {shallowBankDepth.toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={shallowBankDepth}
                onChange={(e) => setShallowBankDepth(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Sondagem batimétrica da crista do banco arenoso
              </span>
            </div>
          </div>
        </div>

        {/* Right: Hydrographic Balance & Safe Passage Windows */}
        <div className="lg:col-span-5 space-y-5">
          {/* Hydrographic Depth Balance Box */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold tracking-wide text-cyan-400 uppercase flex items-center gap-2 border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4" />
              Balanço Batimétrico Instantâneo
            </h3>

            <div className="space-y-2 mt-3 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">(+) Profundidade no Zero Hidrográfico:</span>
                <span className="text-slate-200 font-bold">{shallowBankDepth.toFixed(2)} m</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">(+) Altura Instantânea da Maré:</span>
                <span className="text-cyan-400 font-bold">+{tideState.currentHeight.toFixed(2)} m</span>
              </div>

              <div className="flex justify-between py-1.5 bg-slate-950/80 px-2.5 rounded-lg border border-slate-800">
                <span className="text-white font-bold">(=) Lâmina d'Água Total:</span>
                <span className="text-cyan-300 font-bold text-sm">{currentTotalWaterDepth.toFixed(2)} m</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                <span>(-) Calado Estático da Embarcação:</span>
                <span className="text-rose-300 font-bold">-{customDraft.toFixed(2)} m</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                <span>(-) Afundamento Dinâmico (Squat):</span>
                <span className="text-rose-300 font-bold">-{calculatedSquat.toFixed(2)} m</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                <span>(-) Margem de Onda Requerida:</span>
                <span className="text-amber-300 font-bold">-{customSafetyMargin.toFixed(2)} m</span>
              </div>

              <div className="flex justify-between py-2 bg-slate-950 px-2.5 rounded-lg border border-cyan-800/60 mt-2">
                <span className="text-white font-bold">Folga Efetiva de Segurança:</span>
                <span className={`font-bold text-sm ${effectiveSafetyMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {effectiveSafetyMargin >= 0 ? `+${effectiveSafetyMargin.toFixed(2)} m` : `${effectiveSafetyMargin.toFixed(2)} m`}
                </span>
              </div>
            </div>
          </div>

          {/* Safe Crossing Windows Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold tracking-wide text-cyan-400 uppercase flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Janelas de Travessia Segura Hoje
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                Mínimo {totalRequiredDepth}m
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {safeWindows.length === 0 ? (
                <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300">
                  Nenhuma janela de segurança detectada para este calado hoje. Aguarde marés de sizígia mais altas ou alivie a carga da embarcação.
                </div>
              ) : (
                safeWindows.map((win, i) => (
                  <div key={i} className="p-3 bg-slate-950/80 rounded-xl border border-emerald-800/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-emerald-400 block font-mono">
                        Janela #{i + 1}: {win.start} às {win.end}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Profundidade máxima no pico: <span className="text-slate-200 font-bold font-mono">{win.maxDepth.toFixed(2)} m</span>
                      </span>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-700/50">
                      LIBERADO
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
