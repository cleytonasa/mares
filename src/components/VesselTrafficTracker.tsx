import React, { useState } from 'react';
import {
  Ship,
  Anchor,
  Compass,
  Radio,
  Search,
  Navigation,
  MapPin,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  Info,
} from 'lucide-react';
import { VesselAIS, VesselCategory, CustomUserLocation, PortConfig } from '../types/maritime';
import { calculateDistanceNM, calculateBearing } from '../data/vesselTrafficData';
import { CurrentTideState } from '../utils/tideCalculations';

interface VesselTrafficTrackerProps {
  vessels: VesselAIS[];
  userLocation: CustomUserLocation;
  currentTide: CurrentTideState;
  activePort: PortConfig;
  onSelectVesselOnMap: (vessel: VesselAIS) => void;
  onOpenManualLocationModal: () => void;
}

export const VesselTrafficTracker: React.FC<VesselTrafficTrackerProps> = ({
  vessels,
  userLocation,
  currentTide,
  activePort,
  onSelectVesselOnMap,
  onOpenManualLocationModal,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<VesselCategory | 'all'>('all');
  const [selectedVesselDetail, setSelectedVesselDetail] = useState<VesselAIS | null>(null);

  // Filter vessels
  const filteredVessels = vessels.filter((v) => {
    const matchesCategory = selectedCategory === 'all' || v.type === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.name.toLowerCase().includes(term) ||
      v.mmsi.includes(term) ||
      v.callSign.toLowerCase().includes(term) ||
      v.typeName.toLowerCase().includes(term) ||
      v.destination.toLowerCase().includes(term) ||
      (v.cargo && v.cargo.toLowerCase().includes(term))
    );
  });

  // Calculate distance & bearing for each vessel relative to userLocation
  const vesselsWithRange = filteredVessels.map((v) => {
    const distNM = calculateDistanceNM(userLocation.lat, userLocation.lng, v.lat, v.lng);
    const bearing = calculateBearing(userLocation.lat, userLocation.lng, v.lat, v.lng);
    return {
      ...v,
      distNM,
      bearing,
    };
  }).sort((a, b) => a.distNM - b.distNM);

  // Stats
  const barcacasCount = vessels.filter((v) => v.type === 'barcaca').length;
  const rebocadoresCount = vessels.filter((v) => v.type === 'rebocador').length;
  const naviosCount = vessels.filter((v) => v.type === 'navio').length;
  const praticagemCount = vessels.filter((v) => v.type === 'praticagem').length;
  const pesqueirosCount = vessels.filter((v) => v.type === 'pesqueiro').length;

  const getVesselBadgeColor = (type: VesselCategory) => {
    switch (type) {
      case 'barcaca':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'rebocador':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'navio':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'praticagem':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'pesqueiro':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'offshore':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-5 text-slate-100">
      {/* Top Banner with User Location Reference */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <Ship className="w-5 h-5 text-cyan-400" />
                Sistema de Monitoramento e Tráfego AIS (Costa Branca)
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[10px] font-mono font-bold animate-pulse">
                AIS ATIVO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Barcaças Salineiras, Rebocadores, Navios Graneleiros no TERMISA e Tráfego Fluvial/Costeiro
            </p>
          </div>

          {/* User Location Bar */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Referência de Posição:</span>
                <span className="font-bold text-slate-200">
                  {userLocation.dmsLat} {userLocation.dmsLng}
                </span>
              </div>
            </div>
            <button
              onClick={onOpenManualLocationModal}
              className="ml-2 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] transition"
            >
              Alterar Posição
            </button>
          </div>
        </div>

        {/* Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div
            onClick={() => setSelectedCategory('all')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              selectedCategory === 'all'
                ? 'bg-cyan-950/70 border-cyan-500'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Ativo</span>
            <span className="text-xl font-black font-mono text-white mt-0.5 block">{vessels.length}</span>
            <span className="text-[10px] text-slate-500 font-mono">embarcações</span>
          </div>

          <div
            onClick={() => setSelectedCategory('barcaca')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              selectedCategory === 'barcaca'
                ? 'bg-cyan-950/70 border-cyan-500'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-cyan-400 block">Barcaças Salineiras</span>
            <span className="text-xl font-black font-mono text-cyan-300 mt-0.5 block">{barcacasCount}</span>
            <span className="text-[10px] text-slate-500 font-mono">Rio Mossoró/TERMISA</span>
          </div>

          <div
            onClick={() => setSelectedCategory('rebocador')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              selectedCategory === 'rebocador'
                ? 'bg-amber-950/70 border-amber-500'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Rebocadores</span>
            <span className="text-xl font-black font-mono text-amber-300 mt-0.5 block">{rebocadoresCount}</span>
            <span className="text-[10px] text-slate-500 font-mono">Apoio & Manobra</span>
          </div>

          <div
            onClick={() => setSelectedCategory('navio')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              selectedCategory === 'navio'
                ? 'bg-purple-950/70 border-purple-500'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-purple-400 block">Navios Graneleiros</span>
            <span className="text-xl font-black font-mono text-purple-300 mt-0.5 block">{naviosCount}</span>
            <span className="text-[10px] text-slate-500 font-mono">Panamax / Supramax</span>
          </div>

          <div
            onClick={() => setSelectedCategory('praticagem')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              selectedCategory === 'praticagem'
                ? 'bg-emerald-950/70 border-emerald-500'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Praticagem</span>
            <span className="text-xl font-black font-mono text-emerald-300 mt-0.5 block">{praticagemCount}</span>
            <span className="text-[10px] text-slate-500 font-mono">Lanchas da Barra</span>
          </div>

          <div
            onClick={() => setSelectedCategory('pesqueiro')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              selectedCategory === 'pesqueiro'
                ? 'bg-blue-950/70 border-blue-500'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-blue-400 block">Pesqueiros</span>
            <span className="text-xl font-black font-mono text-blue-300 mt-0.5 block">{pesqueirosCount}</span>
            <span className="text-[10px] text-slate-500 font-mono">Atuneiros & Barcos</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Nome, MMSI, Indicativo, Carga ou Destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-medium">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedCategory === 'all'
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({vessels.length})
          </button>
          <button
            onClick={() => setSelectedCategory('barcaca')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedCategory === 'barcaca'
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Barcaças
          </button>
          <button
            onClick={() => setSelectedCategory('rebocador')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedCategory === 'rebocador'
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Rebocadores
          </button>
          <button
            onClick={() => setSelectedCategory('navio')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedCategory === 'navio'
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Navios
          </button>
          <button
            onClick={() => setSelectedCategory('praticagem')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedCategory === 'praticagem'
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Praticagem
          </button>
          <button
            onClick={() => setSelectedCategory('pesqueiro')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedCategory === 'pesqueiro'
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Pesqueiros
          </button>
        </div>
      </div>

      {/* Vessels Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vesselsWithRange.map((vessel) => {
          const badgeClass = getVesselBadgeColor(vessel.type);

          return (
            <div
              key={vessel.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition flex flex-col justify-between space-y-4 group"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{vessel.flag.split(' ')[0]}</span>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase group-hover:text-cyan-400 transition">
                        {vessel.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {vessel.typeName}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeClass} shrink-0`}>
                    {vessel.status}
                  </span>
                </div>

                {/* Distance & Bearing Tag */}
                <div className="mt-3 p-2 bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    Distância de Você:
                  </span>
                  <span className="font-bold text-cyan-300">
                    {vessel.distNM} NM (Rumo {vessel.bearing}°)
                  </span>
                </div>
              </div>

              {/* Maritime Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Velocidade (SOG)</span>
                  <span className="font-bold text-white">{vessel.speedKnots.toFixed(1)} nós</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Rumo (COG)</span>
                  <span className="font-bold text-white">{vessel.heading}°</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Calado Atual</span>
                  <span className="font-bold text-amber-300">{vessel.draftMeters.toFixed(1)} m</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Dimensões (LOA x Boca)</span>
                  <span className="font-bold text-white">{vessel.lengthMeters}m x {vessel.beamMeters}m</span>
                </div>
              </div>

              {/* Voyage Info */}
              <div className="space-y-1 text-xs font-mono text-slate-300 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Destino:</span>
                  <span className="font-bold text-slate-200">{vessel.destination}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Canal VHF:</span>
                  <span className="font-bold text-cyan-400">{vessel.vhfChannel}</span>
                </div>
                {vessel.cargo && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Carga:</span>
                    <span className="text-slate-300 truncate max-w-[180px]">{vessel.cargo}</span>
                  </div>
                )}
              </div>

              {/* Card Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onSelectVesselOnMap(vessel)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/20"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Ver na Carta Náutica
                </button>
                <button
                  onClick={() => setSelectedVesselDetail(vessel)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700"
                  title="Ficha Técnica & Rádio"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vessel Detail & VHF Protocol Modal */}
      {selectedVesselDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Ship className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedVesselDetail.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    MMSI: {selectedVesselDetail.mmsi} • Indicativo: {selectedVesselDetail.callSign}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVesselDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tipo de Embarcação:</span>
                  <span className="font-bold text-white">{selectedVesselDetail.typeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bandeira:</span>
                  <span className="font-bold text-white">{selectedVesselDetail.flag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Posição Atual:</span>
                  <span className="font-bold text-cyan-300">
                    {selectedVesselDetail.dmsLat} {selectedVesselDetail.dmsLng}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Distância de Você:</span>
                  <span className="font-bold text-cyan-300">
                    {calculateDistanceNM(userLocation.lat, userLocation.lng, selectedVesselDetail.lat, selectedVesselDetail.lng)} NM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calado vs Lâmina na Barra:</span>
                  <span className="font-bold text-amber-300">
                    Calado {selectedVesselDetail.draftMeters}m (Lâmina Atual ~{(activePort.criticalShallowDepth + currentTide.currentHeight).toFixed(2)}m)
                  </span>
                </div>
              </div>

              {/* VHF Radio Contact Guide */}
              <div className="p-3.5 bg-cyan-950/40 rounded-xl border border-cyan-800/40 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Radio className="w-4 h-4" />
                  <span>Protocolo de Chamada VHF Marítimo</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Para chamar esta embarcação no rádio marítimo, use o canal{' '}
                  <strong className="text-cyan-400">{selectedVesselDetail.vhfChannel}</strong>:
                </p>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-200">
                  <em>
                    "{selectedVesselDetail.name}, {selectedVesselDetail.name}, {selectedVesselDetail.name} aqui é [Seu Nome/Barco], no Canal {selectedVesselDetail.vhfChannel}, na escuta, câmbio."
                  </em>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedVesselDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  onSelectVesselOnMap(selectedVesselDetail);
                  setSelectedVesselDetail(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition"
              >
                <MapPin className="w-4 h-4" />
                Localizar no Mapa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
