import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Info, Plus, Ship, Anchor, Lock, Unlock, Edit2, Trash2, Tag, Share2, Check } from 'lucide-react';
import { PortConfig, TideAnnotation } from '../types/maritime';
import { get48hTideCurve, calculateCurrentTide, getNextHighTide } from '../utils/tideCalculations';
import { getTidesForDay } from '../data/tideData2026';
import { AnnotationModal } from './AnnotationModal';
import { OperatorPinModal } from './OperatorPinModal';
import {
  getSavedAnnotations,
  saveAnnotationsToStorage,
  isOperatorAuthorizedSession,
  setOperatorAuthorizedSession,
  generateShareableFleetUrl,
} from '../services/annotationService';
import { parseBargeDateTime, formatBargeTime, formatBargeDate } from '../utils/dateUtils';

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
  const [annotations, setAnnotations] = useState<TideAnnotation[]>([]);
  const [isOperator, setIsOperator] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState<boolean>(false);
  const [editingAnnotation, setEditingAnnotation] = useState<TideAnnotation | null>(null);
  const [modalTargetDate, setModalTargetDate] = useState<Date>(new Date());
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [hoveredAnnotation, setHoveredAnnotation] = useState<{
    annotation: TideAnnotation;
    height: number;
    depth: number;
    x: number;
    y: number;
  } | null>(null);

  // Load annotations & session auth on mount and listen to updates
  useEffect(() => {
    const refreshData = () => {
      setAnnotations(getSavedAnnotations());
      setIsOperator(isOperatorAuthorizedSession());
    };
    refreshData();

    window.addEventListener('tide_annotations_updated', refreshData);
    return () => {
      window.removeEventListener('tide_annotations_updated', refreshData);
    };
  }, []);

  const handleSaveAnnotation = (
    data: Omit<TideAnnotation, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    let updated: TideAnnotation[];
    if (editingId) {
      updated = annotations.map((a) =>
        a.id === editingId ? { ...a, ...data } : a
      );
    } else {
      const newAnn: TideAnnotation = {
        ...data,
        id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      updated = [...annotations, newAnn];
    }
    setAnnotations(updated);
    saveAnnotationsToStorage(updated);
  };

  const handleDeleteAnnotation = (id: string) => {
    const updated = annotations.filter((a) => a.id !== id);
    setAnnotations(updated);
    saveAnnotationsToStorage(updated);
  };

  const handleCopyShareLink = () => {
    const shareUrl = generateShareableFleetUrl(annotations);
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleOpenAddModal = (initialDate?: Date) => {
    if (!isOperator) {
      setIsPinModalOpen(true);
      return;
    }
    setEditingAnnotation(null);
    setModalTargetDate(initialDate || new Date());
    setIsAnnotationModalOpen(true);
  };

  const handleEditAnnotation = (ann: TideAnnotation) => {
    if (!isOperator) {
      setIsPinModalOpen(true);
      return;
    }
    setEditingAnnotation(ann);
    setModalTargetDate(parseBargeDateTime(ann.dateTime));
    setIsAnnotationModalOpen(true);
  };

  const handleToggleOperatorAuth = () => {
    if (isOperator) {
      setOperatorAuthorizedSession(false);
      setIsOperator(false);
    } else {
      setIsPinModalOpen(true);
    }
  };

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
  const svgHeight = 310;
  const padding = { top: 40, right: 30, bottom: 68, left: 45 };

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

  // Filter annotations relevant to this port & currently viewed 48h window
  const windowAnnotations = annotations
    .filter((a) => a.portId === port.id)
    .map((a) => {
      const aDate = parseBargeDateTime(a.dateTime);
      const aTs = aDate.getTime();
      const fraction = (aTs - startWindowTs) / (48 * 60 * 60 * 1000);
      const inWindow = fraction >= 0 && fraction <= 1;
      const x = scaleX(fraction);
      const calculated = calculateCurrentTide(aDate, port);
      const y = scaleY(calculated.currentHeight);
      return {
        annotation: a,
        date: aDate,
        inWindow,
        fraction,
        x,
        y,
        height: calculated.currentHeight,
        depth: calculated.currentWaterDepth,
      };
    })
    .filter((a) => a.inWindow);

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

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (onSelectTime) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(svgWidth, ((e.clientX - rect.left) / rect.width) * svgWidth));
      const fraction = Math.max(0, Math.min(1, (clickX - padding.left) / chartWidth));
      const totalMinutes = fraction * 2880; // 48 hours = 2880 minutes
      const targetDate = new Date(startWindowTs + totalMinutes * 60 * 1000);
      onSelectTime(targetDate);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 md:p-6 shadow-xl text-slate-100 space-y-4">
      {/* Top Bar with Date Navigation & Operator Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Curva Harmônica de Variação (48 Horas)
          </h3>

          {/* Operator Mode Badge / Toggle */}
          <button
            onClick={handleToggleOperatorAuth}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              isOperator
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={isOperator ? 'Modo Operador Ativo (Clique para bloquear)' : 'Acesso Restrito: Modo Somente Leitura'}
          >
            {isOperator ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Modo Operador</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Somente Leitura</span>
              </>
            )}
          </button>
        </div>

        {/* Date Selector & Add Marker Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyShareLink}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              copiedLink
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Copiar Link da Programação Completa para Acesso Externo"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link c/ Barcaças'}</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition"
            title="Adicionar Marcação de Barcaça / Manobra no Gráfico"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Barcaça / Evento</span>
          </button>

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

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden select-none pt-2 bg-slate-950/40 rounded-xl border border-slate-800/60 p-1 sm:p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block cursor-default"
          onMouseLeave={() => {
            setHoveredAnnotation(null);
          }}
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

          {/* Midnight 24h / 00h Vertical Divider Line */}
          <line
            x1={midnightX}
            y1={padding.top}
            x2={midnightX}
            y2={svgHeight - padding.bottom}
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Bottom baseline */}
          <line
            x1={padding.left}
            y1={svgHeight - padding.bottom}
            x2={svgWidth - padding.right}
            y2={svgHeight - padding.bottom}
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Y Axis ticks & labels (without horizontal grid lines across chart) */}
          {[0, 1, 2, 3, 4].map((level) => {
            const y = scaleY(level);
            return (
              <g key={level}>
                {/* Small tick mark on Y axis */}
                <line
                  x1={padding.left - 4}
                  y1={y}
                  x2={padding.left}
                  y2={y}
                  stroke="#475569"
                  strokeWidth="1"
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

          {/* X Axis Time Marks across 48 Hours */}
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
                  y={svgHeight - padding.bottom + 17}
                  fill={item.hour === 24 ? '#38bdf8' : '#94a3b8'}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight={item.hour === 24 ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.label}
                </text>
                {item.hour === 24 && (
                  <text
                    x={x}
                    y={svgHeight - padding.bottom + 29}
                    fill="#0ea5e9"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Virada de Dia
                  </text>
                )}
              </g>
            );
          })}

          {/* Day Date Legends */}
          <g>
            <line
              x1={scaleX(0.04)}
              y1={svgHeight - padding.bottom + 34}
              x2={scaleX(0.44)}
              y2={svgHeight - padding.bottom + 34}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={scaleX(0.25)}
              y={svgHeight - padding.bottom + 50}
              fill="#38bdf8"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {d1.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </text>

            <line
              x1={scaleX(0.56)}
              y1={svgHeight - padding.bottom + 34}
              x2={scaleX(0.96)}
              y2={svgHeight - padding.bottom + 34}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={scaleX(0.75)}
              y={svgHeight - padding.bottom + 50}
              fill="#94a3b8"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {d2.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </text>
          </g>

          {/* 48h Tide Area and Line */}
          <path d={areaD} fill="url(#tideGradient48)" />
          <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />

          {/* Day 1 Official Events Markers */}
          {day1Tides.events.map((evt, idx) => {
            const [h, m] = evt.time.split(':').map(Number);
            const fraction = (h * 60 + m) / 2880;
            const x = scaleX(fraction);
            const adjustedHeight = evt.height * port.heightMultiplier;
            const y = scaleY(adjustedHeight);

            return (
              <g key={`d1-${idx}`}>
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

          {/* Day 2 Official Events Markers */}
          {day2Tides.events.map((evt, idx) => {
            const [h, m] = evt.time.split(':').map(Number);
            const fraction = (1440 + h * 60 + m) / 2880;
            const x = scaleX(fraction);
            const adjustedHeight = evt.height * port.heightMultiplier;
            const y = scaleY(adjustedHeight);

            return (
              <g key={`d2-${idx}`}>
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

          {/* OPERATIONAL BARGE / SHIP ANNOTATIONS ON CHART (CLEAN, MINIMAL NAUTICAL PINS) */}
          {windowAnnotations.map((item) => {
            const itemColor = item.annotation.color || '#38bdf8';
            const isHovered = hoveredAnnotation?.annotation.id === item.annotation.id;
            const markerY = item.y;
            const pinY = padding.top - 8;

            return (
              <g
                key={item.annotation.id}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditAnnotation(item.annotation);
                }}
                onMouseEnter={() => setHoveredAnnotation(item)}
                onMouseLeave={() => setHoveredAnnotation(null)}
              >
                {/* Vertical Line */}
                <line
                  x1={item.x}
                  y1={pinY}
                  x2={item.x}
                  y2={svgHeight - padding.bottom}
                  stroke={itemColor}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeDasharray="3 3"
                  opacity={isHovered ? 1 : 0.85}
                />

                {/* Minimal Boat Icon Circular Pin at top (No bulky overlapping rectangles) */}
                <circle
                  cx={item.x}
                  cy={pinY}
                  r={isHovered ? 12 : 10}
                  fill="#020617"
                  stroke={itemColor}
                  strokeWidth={isHovered ? 2.2 : 1.5}
                />
                <text
                  x={item.x}
                  y={pinY + 4}
                  fontSize={isHovered ? '11' : '10'}
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  {item.annotation.category === 'barcaca' ? '⛴️' : item.annotation.category === 'navio' ? '🚢' : '⚓'}
                </text>

                {/* Water surface contact circle marker */}
                <circle
                  cx={item.x}
                  cy={markerY}
                  r={isHovered ? 6.5 : 5}
                  fill={itemColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-transform duration-200"
                />
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
              {/* Clean Agora Badge */}
              <rect
                x={currentCursorX - 32}
                y={padding.top - 20}
                width="64"
                height="16"
                rx="4"
                fill="#450a0a"
                stroke="#ef4444"
                strokeWidth="1"
              />
              <text
                x={currentCursorX}
                y={padding.top - 8}
                fill="#fca5a5"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                AGORA {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </text>
            </g>
          )}
        </svg>

        {/* Hover Tooltip for Operational Barge Annotations */}
        {hoveredAnnotation && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-950 border border-cyan-400 p-3 rounded-xl shadow-2xl text-xs font-sans text-slate-100 backdrop-blur max-w-xs"
            style={{
              left: `${Math.min(70, Math.max(5, (hoveredAnnotation.x / svgWidth) * 100))}%`,
              top: '20px',
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <span className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                {hoveredAnnotation.annotation.category === 'barcaca' ? '⛴️' : '🚢'} {hoveredAnnotation.annotation.title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-800">
                {formatBargeTime(hoveredAnnotation.annotation.dateTime)} BRT
              </span>
            </div>

            {hoveredAnnotation.annotation.bargeStatus && (
              <div className="mt-1.5 text-[11px] font-medium flex items-center gap-1.5">
                <span className="text-slate-400">Status:</span>
                <span className={`font-semibold ${
                  hoveredAnnotation.annotation.bargeStatus === 'Finalizada'
                    ? 'text-emerald-300'
                    : hoveredAnnotation.annotation.bargeStatus === 'Operação de Descarga'
                    ? 'text-purple-300'
                    : 'text-rose-300'
                }`}>
                  {hoveredAnnotation.annotation.bargeStatus === 'Finalizada' && '🟢 '}
                  {hoveredAnnotation.annotation.bargeStatus === 'Operação de Descarga' && '🟣 '}
                  {hoveredAnnotation.annotation.bargeStatus === 'No largo / Aguardando' && '🔴 '}
                  {hoveredAnnotation.annotation.bargeStatus}
                </span>
              </div>
            )}

            {(() => {
              const annDate = parseBargeDateTime(hoveredAnnotation.annotation.dateTime);
              const nextHigh = getNextHighTide(annDate, port);
              return (
                <div className="mt-1.5 flex justify-between items-center gap-2 text-[11px] font-mono bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Próxima Preamar:</span>
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <span>🔼 {nextHigh.timeStr}</span>
                    <span className="text-cyan-300">({nextHigh.height.toFixed(2)}m)</span>
                  </span>
                </div>
              );
            })()}

            {hoveredAnnotation.annotation.notes && (
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-300 italic">
                "{hoveredAnnotation.annotation.notes}"
              </div>
            )}

            <div className="mt-2 text-[10px] text-slate-500 text-right">
              {isOperator ? 'Clique no marcador para editar/excluir' : 'Modo visualização'}
            </div>
          </div>
        )}
      </div>

      {/* Operational Barge Schedule List Section below the Chart */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            Programação Operacional das Barcaças & Eventos ({windowAnnotations.length} ativos nas 48h)
          </h4>
          {isOperator && (
            <button
              onClick={() => handleOpenAddModal()}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Barcaça
            </button>
          )}
        </div>

        {windowAnnotations.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
            Nenhuma marcação de barcaça ou manobra registrada nesta janela de 48h.{' '}
            {isOperator && (
              <button
                onClick={() => handleOpenAddModal()}
                className="text-cyan-400 underline font-semibold hover:text-cyan-300 ml-1"
              >
                Clique para adicionar
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {windowAnnotations.map((item) => {
              const dt = parseBargeDateTime(item.annotation.dateTime);
              const timeDisplay = formatBargeTime(item.annotation.dateTime);
              const dateDisplay = dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
              const itemColor = item.annotation.color || '#38bdf8';
              const nextHigh = getNextHighTide(dt, port);

              return (
                <div
                  key={item.annotation.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition flex items-start justify-between gap-2 shadow"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        {item.annotation.category === 'barcaca' ? '⛴️' : '🚢'} {item.annotation.title}
                      </span>
                    </div>

                    <div className="text-[11px] text-cyan-300 font-mono flex flex-wrap items-center gap-1.5">
                      <span>🕒 {timeDisplay} BRT</span>
                      <span>•</span>
                      <span className="text-emerald-300 font-semibold flex items-center gap-1">
                        <span>Preamar:</span>
                        <span>🔼 {nextHigh.timeStr}</span>
                        <span>({nextHigh.height.toFixed(2)}m)</span>
                      </span>
                    </div>

                    {item.annotation.bargeStatus && (
                      <div className="pt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            item.annotation.bargeStatus === 'Finalizada'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                              : item.annotation.bargeStatus === 'Operação de Descarga'
                              ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                              : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                          }`}
                        >
                          {item.annotation.bargeStatus === 'Finalizada' && '🟢 '}
                          {item.annotation.bargeStatus === 'Operação de Descarga' && '🟣 '}
                          {item.annotation.bargeStatus === 'No largo / Aguardando' && '🔴 '}
                          {item.annotation.bargeStatus}
                        </span>
                      </div>
                    )}

                    {item.annotation.notes && (
                      <div className="text-[10px] text-slate-400 line-clamp-1 italic">
                        "{item.annotation.notes}"
                      </div>
                    )}
                  </div>

                  {/* Actions for authorized operators */}
                  {isOperator && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditAnnotation(item.annotation)}
                        className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAnnotation(item.annotation.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Annotation Creation / Edit Modal */}
      <AnnotationModal
        isOpen={isAnnotationModalOpen}
        onClose={() => setIsAnnotationModalOpen(false)}
        onSave={handleSaveAnnotation}
        onDelete={handleDeleteAnnotation}
        editingAnnotation={editingAnnotation}
        selectedDateTime={modalTargetDate}
        portId={port.id}
      />

      {/* Security PIN Authorization Modal */}
      <OperatorPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setOperatorAuthorizedSession(true);
          setIsOperator(true);
        }}
      />
    </div>
  );
};
