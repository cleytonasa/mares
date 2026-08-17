import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Waves, Clock, Compass, ShieldAlert, Sparkles } from 'lucide-react';
import { CurrentTideState } from '../utils/tideCalculations';
import { PortConfig } from '../types/maritime';

interface CurrentTideCardProps {
  tideState: CurrentTideState;
  port: PortConfig;
  currentTime: Date;
  onSimulateTime?: (date: Date) => void;
  isSimulated?: boolean;
  onResetSimulation?: () => void;
}

export const CurrentTideCard: React.FC<CurrentTideCardProps> = ({
  tideState,
  port,
  currentTime,
  isSimulated,
  onResetSimulation,
}) => {
  const {
    currentHeight,
    rateOfChangeCmPerHour,
    trend,
    trendDescription,
    previousEvent,
    nextEvent,
    percentCycle,
    amplitude,
    coefficientType,
    minutesToNextEvent,
    currentWaterDepth,
  } = tideState;

  const hoursToNext = Math.floor(minutesToNextEvent / 60);
  const minsToNext = minutesToNextEvent % 60;

  // Calculate percentage of water level inside gauge (0m to 4.0m range)
  const maxScale = 4.0;
  const heightPercent = Math.min(100, Math.max(5, (currentHeight / maxScale) * 100));

  const getTrendIcon = () => {
    if (trend === 'ENCHENDO') {
      return <ArrowUpRight className="w-5 h-5 text-emerald-400 animate-bounce" />;
    } else if (trend === 'VAZANDO') {
      return <ArrowDownRight className="w-5 h-5 text-amber-400 animate-bounce" />;
    }
    return <Minus className="w-5 h-5 text-cyan-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'ENCHENDO') return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
    if (trend === 'VAZANDO') return 'text-amber-400 bg-amber-950/60 border-amber-500/30';
    return 'text-cyan-300 bg-cyan-950/60 border-cyan-500/30';
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl relative overflow-hidden text-slate-100">
      {/* Background ocean ambient glow */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
              <Waves className="w-4 h-4" />
              Nível da Maré em Tempo Real
            </h2>
            {isSimulated && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                MODO SIMULAÇÃO
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {port.fullName} • {port.dhnStation}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSimulated && onResetSimulation && (
            <button
              onClick={onResetSimulation}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
            >
              Voltar ao Tempo Real
            </button>
          )}

          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-300">
            ZH Datum: 0.00 m
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center relative z-10">
        {/* Left: Height Number & Gauge */}
        <div className="lg:col-span-5 flex items-center gap-6">
          {/* Vertical Level Tube Visualizer */}
          <div className="relative w-12 h-44 bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden flex flex-col justify-end p-1 shadow-inner">
            {/* Scale markers */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 px-1 text-[8px] font-mono text-slate-600 pointer-events-none select-none">
              <span className="text-right">4.0m</span>
              <span className="text-right">3.0m</span>
              <span className="text-right">2.0m</span>
              <span className="text-right">1.0m</span>
              <span className="text-right">0.0m</span>
            </div>

            {/* Mean sea level line marker */}
            <div
              className="absolute w-full left-0 border-t border-dashed border-cyan-400/50 z-20"
              style={{ bottom: `${(port.meanLevel / maxScale) * 100}%` }}
              title={`Nível Médio: ${port.meanLevel}m`}
            />

            {/* Animated Water Column */}
            <div
              className="w-full bg-gradient-to-t from-blue-700 via-cyan-600 to-cyan-400 rounded-xl transition-all duration-700 ease-out relative overflow-hidden shadow-lg shadow-cyan-500/30"
              style={{ height: `${heightPercent}%` }}
            >
              {/* Wave surface shimmer */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-white/40 animate-pulse" />
            </div>
          </div>

          {/* Large Height Display */}
          <div className="flex-1">
            <span className="text-xs uppercase font-medium text-slate-400 block tracking-wider">
              Altura Instantânea
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white">
                {currentHeight.toFixed(2)}
              </span>
              <span className="text-lg font-bold text-cyan-400 font-mono">metros</span>
            </div>

            {/* Depth over shallowest bar bank */}
            <div className="mt-2 text-xs font-mono text-slate-300 flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Lâmina d'água na Barra:</span>
              <span className="text-cyan-300 font-bold">{currentWaterDepth.toFixed(2)} m</span>
            </div>

            {/* Trend Badge */}
            <div className={`mt-3 px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <div>
                <span className="block font-bold">{trendDescription}</span>
                <span className="text-[10px] font-mono text-slate-300">
                  {rateOfChangeCmPerHour > 0 ? `+${rateOfChangeCmPerHour}` : rateOfChangeCmPerHour} cm/hora
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Cycle Progress & Extremum Points */}
        <div className="lg:col-span-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Ciclo Semidiurno
            </span>
            <span className="font-bold text-cyan-300">{percentCycle}% concluído</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full my-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentCycle}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Previous Event */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">
                {previousEvent.type === 'high' ? 'Última Preia-mar' : 'Última Baixa-mar'}
              </span>
              <span className="text-sm font-bold text-slate-200">{previousEvent.timeStr}</span>
              <span className="block text-[11px] text-cyan-400 font-semibold">{previousEvent.height.toFixed(2)} m</span>
            </div>

            {/* Next Event */}
            <div className="bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/50">
              <span className="text-[10px] uppercase text-cyan-300 font-semibold block">
                {nextEvent.type === 'high' ? 'Próxima Preia-mar' : 'Próxima Baixa-mar'}
              </span>
              <span className="text-sm font-bold text-white">{nextEvent.timeStr}</span>
              <span className="block text-[11px] text-emerald-400 font-bold">{nextEvent.height.toFixed(2)} m</span>
            </div>
          </div>

          {/* Countdown pill */}
          <div className="mt-3 text-center text-xs font-mono py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
            Faltam <span className="text-cyan-400 font-bold">{hoursToNext}h {minsToNext}m</span> para {nextEvent.type === 'high' ? 'Preia-mar' : 'Baixa-mar'}
          </div>
        </div>

        {/* Right: Amplitude & Regime */}
        <div className="lg:col-span-3 space-y-2.5">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 block tracking-wider font-semibold">
              Regime de Maré
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                MARÉ DE {coefficientType}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Variação de amplitude: <span className="text-slate-200 font-mono font-bold">{amplitude.toFixed(2)} m</span>
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 block tracking-wider font-semibold">
              Referência DHN
            </span>
            <div className="text-[11px] font-mono text-slate-300 space-y-0.5 mt-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Nível Médio (NM):</span>
                <span className="font-bold">{port.meanLevel} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Zero Hidrográfico:</span>
                <span className="font-bold">Carta {port.chartNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Offset Local:</span>
                <span className="font-bold text-cyan-400">
                  {port.timeOffsetMinutes === 0 ? 'Referência Padrão' : `${port.timeOffsetMinutes} min`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
