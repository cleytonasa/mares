import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Play, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PortConfig } from '../types/maritime';
import { get24hTideCurve, calculateCurrentTide } from '../utils/tideCalculations';
import { getTidesForDay } from '../data/tideData2026';

interface TideChart24hProps {
  port: PortConfig;
  selectedDate: Date;
  onChangeDate: (newDate: Date) => void;
  currentTime: Date;
  vesselDraft?: number;
  onSelectTime?: (time: Date) => void;
}

export const TideChart24h: React.FC<TideChart24hProps> = ({
  port,
  selectedDate,
  onChangeDate,
  currentTime,
  vesselDraft = 3.2,
  onSelectTime,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ time: string; height: number; depth: number; x: number; y: number } | null>(null);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const day = selectedDate.getDate();

  const dayTides = getTidesForDay(year, month, day);
  const curvePoints = get24hTideCurve(selectedDate, port, 96); // 96 points = 15 min resolution

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 30, right: 30, bottom: 40, left: 45 };

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const minHeight = 0.0;
  const maxHeight = 4.0;

  const scaleX = (fraction: number) => padding.left + fraction * chartWidth;
  const scaleY = (height: number) => padding.top + (1 - (height - minHeight) / (maxHeight - minHeight)) * chartHeight;

  // Build SVG Path
  const pathD = curvePoints.reduce((acc, pt, idx) => {
    const fraction = idx / (curvePoints.length - 1);
    const x = scaleX(fraction);
    const y = scaleY(pt.height);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${scaleX(1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;

  // Calculate position of current time cursor if viewing today
  const isViewingToday = selectedDate.toDateString() === currentTime.toDateString();
  const currentDayFraction = (currentTime.getHours() * 60 + currentTime.getMinutes()) / 1440;
  const currentCursorX = scaleX(currentDayFraction);

  // Safe navigation threshold line (e.g. required tide height = vesselDraft + 0.5m FAQ - criticalShallowDepth)
  const requiredTideHeight = Math.max(0, vesselDraft + 0.5 - port.criticalShallowDepth);
  const thresholdY = scaleY(requiredTideHeight);

  // Moon phase icon / label
  const getMoonLabel = () => {
    switch (dayTides.moonPhase) {
      case 'full':
        return '🌕 Lua Cheia (Maré de Sizígia Máxima)';
      case 'new':
        return '🌑 Lua Nova (Maré de Sizígia)';
      case 'first_quarter':
        return '🌓 Quarto Crescente (Quadratura)';
      case 'last_quarter':
        return '🌗 Quarto Minguante (Quadratura)';
      default:
        return 'Lua Intermediária';
    }
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onChangeDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onChangeDate(d);
  };

  const handleToday = () => {
    onChangeDate(new Date());
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const fraction = Math.max(0, Math.min(1, (clickX - padding.left) / chartWidth));

    const totalMinutes = fraction * 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const testDate = new Date(selectedDate);
    testDate.setHours(hours, minutes, 0, 0);

    const testState = calculateCurrentTide(testDate, port);
    const y = scaleY(testState.currentHeight);

    setHoveredPoint({
      time: timeStr,
      height: testState.currentHeight,
      depth: testState.currentWaterDepth,
      x: clickX,
      y,
    });
  };

  const handleSvgClick = () => {
    if (hoveredPoint && onSelectTime) {
      const [h, m] = hoveredPoint.time.split(':').map(Number);
      const newD = new Date(selectedDate);
      newD.setHours(h, m, 0, 0);
      onSelectTime(newD);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl text-slate-100">
      {/* Top Bar with Date Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Curva Harmônica de Variação (24 Horas)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Previsão contínua com interpolação senoidal oficial para {port.name}
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Dia Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono font-bold text-slate-200">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Próximo Dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isViewingToday && (
            <button
              onClick={handleToday}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 transition"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Lunar Phase & Day Events Banner */}
      <div className="my-3 py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-medium text-slate-300">
          <span>{getMoonLabel()}</span>
        </div>

        {/* Event chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {dayTides.events.map((evt, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                evt.type === 'high'
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {evt.type === 'high' ? 'PM' : 'BM'}: {evt.time} ({evt.height.toFixed(2)}m)
            </span>
          ))}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onClick={handleSvgClick}
        >
          <defs>
            {/* Area Gradient */}
            <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.0" />
            </linearGradient>

            {/* Threshold Safe Gradient */}
            <linearGradient id="safeWindowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y Axis labels */}
          {[0, 1, 2, 3, 4].map((level) => {
            const y = scaleY(level);
            return (
              <g key={level}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray={level === 0 ? undefined : "3 3"}
                  strokeWidth={level === 0 ? 1.5 : 0.8}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {level.toFixed(1)}m
                </text>
              </g>
            );
          })}

          {/* Mean Sea Level Line (Nível Médio) */}
          <line
            x1={padding.left}
            y1={scaleY(port.meanLevel)}
            x2={svgWidth - padding.right}
            y2={scaleY(port.meanLevel)}
            stroke="#06b6d4"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.6"
          />
          <text
            x={svgWidth - padding.right}
            y={scaleY(port.meanLevel) - 4}
            fill="#38bdf8"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
          >
            NM {port.meanLevel}m
          </text>

          {/* Calado / Safe Crossing Threshold Line */}
          {requiredTideHeight > 0 && requiredTideHeight < maxHeight && (
            <g>
              <line
                x1={padding.left}
                y1={thresholdY}
                x2={svgWidth - padding.right}
                y2={thresholdY}
                stroke="#eab308"
                strokeDasharray="2 2"
                strokeWidth="1.2"
              />
              <text
                x={padding.left + 5}
                y={thresholdY - 4}
                fill="#facc15"
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                Mínimo Seguro para Calado {vesselDraft.toFixed(1)}m ({requiredTideHeight.toFixed(2)}m)
              </text>
            </g>
          )}

          {/* X Axis Time Marks (Every 3 hours) */}
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => {
            const fraction = hour / 24;
            const x = scaleX(fraction);
            return (
              <g key={hour}>
                <line
                  x1={x}
                  y1={svgHeight - padding.bottom}
                  x2={x}
                  y2={svgHeight - padding.bottom + 5}
                  stroke="#475569"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={svgHeight - padding.bottom + 18}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {String(hour).padStart(2, '0')}:00
                </text>
              </g>
            );
          })}

          {/* Tide Area and Line */}
          <path d={areaD} fill="url(#tideGradient)" />
          <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />

          {/* Tide Extremum Points (High / Low markers) */}
          {dayTides.events.map((evt, idx) => {
            const [h, m] = evt.time.split(':').map(Number);
            const fraction = (h * 60 + m) / 1440;
            const x = scaleX(fraction);
            const adjustedHeight = evt.height * port.heightMultiplier;
            const y = scaleY(adjustedHeight);

            return (
              <g key={idx}>
                {/* Vertical drop line */}
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={svgHeight - padding.bottom}
                  stroke={evt.type === 'high' ? '#38bdf8' : '#64748b'}
                  strokeDasharray="2 2"
                  strokeWidth="0.8"
                />

                {/* Point circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={evt.type === 'high' ? 5 : 4}
                  fill={evt.type === 'high' ? '#0284c7' : '#0f172a'}
                  stroke={evt.type === 'high' ? '#38bdf8' : '#94a3b8'}
                  strokeWidth="2"
                />

                {/* Label text */}
                <text
                  x={x}
                  y={evt.type === 'high' ? y - 10 : y + 16}
                  fill={evt.type === 'high' ? '#7dd3fc' : '#cbd5e1'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {evt.time} ({adjustedHeight.toFixed(2)}m)
                </text>
              </g>
            );
          })}

          {/* Current Time Vertical Line */}
          {isViewingToday && (
            <g>
              <line
                x1={currentCursorX}
                y1={padding.top}
                x2={currentCursorX}
                y2={svgHeight - padding.bottom}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <circle
                cx={currentCursorX}
                cy={scaleY(calculateCurrentTide(currentTime, port).currentHeight)}
                r="5"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={currentCursorX}
                y={padding.top - 8}
                fill="#f87171"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                AGORA ({currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
              </text>
            </g>
          )}

          {/* Hover / Simulation vertical line and tooltip marker */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={svgHeight - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="1"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="4.5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-950/95 border border-cyan-500/50 p-2.5 rounded-xl shadow-2xl text-xs font-mono text-slate-200"
            style={{
              left: `${Math.min(svgWidth - 160, Math.max(20, (hoveredPoint.x / svgWidth) * 100))}%`,
              top: '15px',
            }}
          >
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span>🕒 Hora: {hoveredPoint.time}</span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-slate-400">Altura:</span>
              <span className="text-white font-bold">{hoveredPoint.height.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Lâmina na Barra:</span>
              <span className="text-emerald-400 font-bold">{hoveredPoint.depth.toFixed(2)} m</span>
            </div>
            <div className="text-[10px] text-cyan-300/80 mt-1 border-t border-slate-800 pt-1">
              {hoveredPoint.height >= requiredTideHeight ? '✅ Calado seguro' : '⚠️ Risco de encalhe'}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          Passe o mouse ou toque sobre a curva para simular qualquer horário do dia.
        </span>
        <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
          DHN Carta 703 • 27 Componentes Harmônicos
        </span>
      </div>
    </div>
  );
};
