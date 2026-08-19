import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { PortConfig } from '../types/maritime';
import { get48hTideCurve, calculateCurrentTide } from '../utils/tideCalculations';
import { getTidesForDay } from '../data/tideData2026';

interface TideChart48hProps {
  port: PortConfig;
  selectedDate: Date;
  onChangeDate: (newDate: Date) => void;
  currentTime: Date;
  onSelectTime?: (time: Date) => void;
}

export const TideChart24h: React.FC<TideChart48hProps> = ({
  port,
  selectedDate,
  onChangeDate,
  currentTime,
  onSelectTime,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    dateStr: string;
    time: string;
    height: number;
    depth: number;
    x: number;
    y: number;
    rawDate: Date;
  } | null>(null);

  // Day 1 (Reference Date)
  const d1 = new Date(selectedDate);
  const year1 = d1.getFullYear();
  const month1 = d1.getMonth() + 1;
  const day1 = d1.getDate();
  const day1Tides = getTidesForDay(year1, month1, day1);

  // Day 2 (Next Day)
  const d2 = new Date(selectedDate);
  d2.setDate(d2.getDate() + 1);
  const year2 = d2.getFullYear();
  const month2 = d2.getMonth() + 1;
  const day2 = d2.getDate();
  const day2Tides = getTidesForDay(year2, month2, day2);

  // 48h curve points (192 points = 15-minute resolution across 48h)
  const curvePoints = get48hTideCurve(selectedDate, port, 192);

  // SVG dimensions
  const svgWidth = 900;
  const svgHeight = 280;
  const padding = { top: 35, right: 30, bottom: 45, left: 45 };

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const minHeight = 0.0;
  const maxHeight = 4.0;

  const scaleX = (fraction: number) => padding.left + fraction * chartWidth;
  const scaleY = (height: number) => padding.top + (1 - (height - minHeight) / (maxHeight - minHeight)) * chartHeight;

  // Build SVG Path for 48 Hours
  const pathD = curvePoints.reduce((acc, pt, idx) => {
    const fraction = idx / (curvePoints.length - 1);
    const x = scaleX(fraction);
    const y = scaleY(pt.height);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${scaleX(1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;

  // Midnight / Day separation X coordinate (exactly 24h in 48h = fraction 0.5)
  const midnightX = scaleX(0.5);

  // Calculate position of current time cursor within the 48h window
  const startWindowTs = new Date(selectedDate).setHours(0, 0, 0, 0);
  const endWindowTs = startWindowTs + 48 * 60 * 60 * 1000;
  const currentTs = currentTime.getTime();
  const isCurrentTimeInWindow = currentTs >= startWindowTs && currentTs <= endWindowTs;
  const currentWindowFraction = (currentTs - startWindowTs) / (48 * 60 * 60 * 1000);
  const currentCursorX = scaleX(Math.max(0, Math.min(1, currentWindowFraction)));

  const isViewingToday = selectedDate.toDateString() === currentTime.toDateString();

  // Helper for Moon Phase label
  const getMoonBadge = (phase: string) => {
    switch (phase) {
      case 'full':
        return { label: 'Lua Cheia', desc: 'Sizígia Máxima', icon: '🌕', color: 'text-amber-300' };
      case 'new':
        return { label: 'Lua Nova', desc: 'Sizígia', icon: '🌑', color: 'text-cyan-300' };
      case 'first_quarter':
        return { label: 'Q. Crescente', desc: 'Quadratura', icon: '🌓', color: 'text-blue-300' };
      case 'last_quarter':
        return { label: 'Q. Minguante', desc: 'Quadratura', icon: '🌗', color: 'text-blue-300' };
      default:
        return { label: 'Intermediária', desc: 'Maré Média', icon: '🌙', color: 'text-slate-300' };
    }
  };

  const moon1 = getMoonBadge(day1Tides.moonPhase);
  const moon2 = getMoonBadge(day2Tides.moonPhase);

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

  const updateHoverFromClientX = (clientX: number, targetSvg: SVGSVGElement) => {
    const rect = targetSvg.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(svgWidth, ((clientX - rect.left) / rect.width) * svgWidth));
    const fraction = Math.max(0, Math.min(1, (clickX - padding.left) / chartWidth));

    const totalMinutes = fraction * 2880; // 48 hours = 2880 minutes
    const testDate = new Date(startWindowTs + totalMinutes * 60 * 1000);

    const hours = testDate.getHours();
    const minutes = testDate.getMinutes();
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const dateStr = testDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

    const testState = calculateCurrentTide(testDate, port);
    const y = scaleY(testState.currentHeight);

    setHoveredPoint({
      dateStr,
      time: timeStr,
      height: testState.currentHeight,
      depth: testState.currentWaterDepth,
      x: clickX,
      y,
      rawDate: testDate,
    });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updateHoverFromClientX(e.clientX, e.currentTarget);
  };

  const handleSvgTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches && e.touches[0]) {
      updateHoverFromClientX(e.touches[0].clientX, e.currentTarget);
    }
  };

  const handleSvgClick = () => {
    if (hoveredPoint && onSelectTime) {
      onSelectTime(hoveredPoint.rawDate);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 md:p-6 shadow-xl text-slate-100 space-y-4">
      {/* Top Bar with Date Navigation & 48h Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Curva Harmônica de Variação (48 Horas)
          </h3>
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

          <div className="px-2.5 sm:px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono font-bold text-slate-200">
            {d1.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} ➔ {d2.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
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

      {/* 2-Day Chronological Events Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Day 1 Card */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {d1.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
              </span>
              {isViewingToday && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                  HOJE
                </span>
              )}
            </div>
            <span className="text-xs font-mono flex items-center gap-1 text-slate-300">
              <span>{moon1.icon}</span>
              <span className={moon1.color}>{moon1.label}</span>
            </span>
          </div>

          {/* Events */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {day1Tides.events.map((evt, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                  evt.type === 'high'
                    ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/50'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700'
                }`}
              >
                {evt.type === 'high' ? 'PM' : 'BM'}: {evt.time} ({(evt.height * port.heightMultiplier).toFixed(2)}m)
              </span>
            ))}
          </div>
        </div>

        {/* Day 2 Card */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              {d2.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
            </span>
            <span className="text-xs font-mono flex items-center gap-1 text-slate-300">
              <span>{moon2.icon}</span>
              <span className={moon2.color}>{moon2.label}</span>
            </span>
          </div>

          {/* Events */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {day2Tides.events.map((evt, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                  evt.type === 'high'
                    ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/50'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700'
                }`}
              >
                {evt.type === 'high' ? 'PM' : 'BM'}: {evt.time} ({(evt.height * port.heightMultiplier).toFixed(2)}m)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Chart Container - Fully visible and scalable on mobile screens */}
      <div className="relative w-full overflow-hidden select-none pt-2 bg-slate-950/40 rounded-xl border border-slate-800/60 p-1 sm:p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block cursor-crosshair touch-none"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onTouchStart={handleSvgTouch}
          onTouchMove={handleSvgTouch}
          onClick={handleSvgClick}
        >
          <defs>
            {/* Area Gradient */}
            <linearGradient id="tideGradient48" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Day Sections Shading */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth / 2}
            height={chartHeight}
            fill="#0f172a"
            opacity="0.2"
          />
          <rect
            x={midnightX}
            y={padding.top}
            width={chartWidth / 2}
            height={chartHeight}
            fill="#1e293b"
            opacity="0.1"
          />

          {/* Day Label Badges at Top of Chart Area */}
          <text
            x={scaleX(0.25)}
            y={padding.top - 12}
            fill="#38bdf8"
            fontSize="12"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            {d1.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </text>
          <text
            x={scaleX(0.75)}
            y={padding.top - 12}
            fill="#94a3b8"
            fontSize="12"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            {d2.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </text>

          {/* Midnight 24h / 00h Vertical Divider Line */}
          <line
            x1={midnightX}
            y1={padding.top - 20}
            x2={midnightX}
            y2={svgHeight - padding.bottom}
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={midnightX}
            y={padding.top - 8}
            fill="#0ea5e9"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            00:00 (Virada de Dia)
          </text>

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
                  strokeDasharray={level === 0 ? undefined : '3 3'}
                  strokeWidth={level === 0 ? 1.5 : 0.8}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="11"
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
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            NM {port.meanLevel}m
          </text>

          {/* X Axis Time Marks across 48 Hours (Every 6 hours) */}
          {[
            { hour: 0, day: 1, label: '00h' },
            { hour: 6, day: 1, label: '06h' },
            { hour: 12, day: 1, label: '12h' },
            { hour: 18, day: 1, label: '18h' },
            { hour: 24, day: 2, label: '00h' },
            { hour: 30, day: 2, label: '06h' },
            { hour: 36, day: 2, label: '12h' },
            { hour: 42, day: 2, label: '18h' },
            { hour: 48, day: 2, label: '24h' },
          ].map((item, idx) => {
            const fraction = item.hour / 48;
            const x = scaleX(fraction);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={svgHeight - padding.bottom}
                  x2={x}
                  y2={svgHeight - padding.bottom + 5}
                  stroke={item.hour === 24 ? '#0ea5e9' : '#475569'}
                  strokeWidth={item.hour === 24 ? 1.5 : 1}
                />
                <text
                  x={x}
                  y={svgHeight - padding.bottom + 18}
                  fill={item.hour === 24 ? '#38bdf8' : '#94a3b8'}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight={item.hour === 24 ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* 48h Tide Area and Line */}
          <path d={areaD} fill="url(#tideGradient48)" />
          <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />

          {/* Day 1 Events Markers (0-24h) */}
          {day1Tides.events.map((evt, idx) => {
            const [h, m] = evt.time.split(':').map(Number);
            const fraction = (h * 60 + m) / 2880; // in 48h
            const x = scaleX(fraction);
            const adjustedHeight = evt.height * port.heightMultiplier;
            const y = scaleY(adjustedHeight);

            return (
              <g key={`d1-${idx}`}>
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={svgHeight - padding.bottom}
                  stroke={evt.type === 'high' ? '#38bdf8' : '#64748b'}
                  strokeDasharray="2 2"
                  strokeWidth="0.8"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={evt.type === 'high' ? 4.5 : 3.5}
                  fill={evt.type === 'high' ? '#0284c7' : '#0f172a'}
                  stroke={evt.type === 'high' ? '#38bdf8' : '#94a3b8'}
                  strokeWidth="1.8"
                />
                <text
                  x={x}
                  y={evt.type === 'high' ? y - 8 : y + 14}
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

          {/* Day 2 Events Markers (24-48h) */}
          {day2Tides.events.map((evt, idx) => {
            const [h, m] = evt.time.split(':').map(Number);
            const fraction = (1440 + h * 60 + m) / 2880; // in 48h
            const x = scaleX(fraction);
            const adjustedHeight = evt.height * port.heightMultiplier;
            const y = scaleY(adjustedHeight);

            return (
              <g key={`d2-${idx}`}>
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={svgHeight - padding.bottom}
                  stroke={evt.type === 'high' ? '#38bdf8' : '#64748b'}
                  strokeDasharray="2 2"
                  strokeWidth="0.8"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={evt.type === 'high' ? 4.5 : 3.5}
                  fill={evt.type === 'high' ? '#0284c7' : '#0f172a'}
                  stroke={evt.type === 'high' ? '#38bdf8' : '#94a3b8'}
                  strokeWidth="1.8"
                />
                <text
                  x={x}
                  y={evt.type === 'high' ? y - 8 : y + 14}
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

          {/* Real-time Current Position Marker (AGORA) */}
          {isCurrentTimeInWindow && (
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
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                AGORA ({currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
              </text>
            </g>
          )}

          {/* Hover Pointer Marker */}
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

        {/* Hover Tooltip Floating Card */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-950/95 border border-cyan-500/50 p-2.5 rounded-xl shadow-2xl text-xs font-mono text-slate-200 backdrop-blur max-w-[260px] sm:max-w-xs"
            style={{
              left: `${Math.min(75, Math.max(5, (hoveredPoint.x / svgWidth) * 100))}%`,
              top: '15px',
            }}
          >
            <div className="text-cyan-400 font-bold flex items-center justify-between gap-3">
              <span>📅 {hoveredPoint.dateStr}</span>
              <span>🕒 {hoveredPoint.time}</span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-slate-400">Altura da Maré:</span>
              <span className="text-white font-bold">{hoveredPoint.height.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Nível na Barra:</span>
              <span className="text-emerald-400 font-bold">{hoveredPoint.depth.toFixed(2)} m</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint & Legend */}
      <div className="mt-2 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          Passe o mouse ou toque sobre a curva para inspecionar qualquer horário das 48 horas (hoje e amanhã).
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          DHN Carta 703 • 48 Horas Contínuas
        </span>
      </div>
    </div>
  );
};
