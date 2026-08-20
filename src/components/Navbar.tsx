import React from 'react';
import { Anchor, Compass, FileText, Map, Table, Waves } from 'lucide-react';
import { PortConfig, CustomUserLocation } from '../types/maritime';
import { IntersalLogo } from './IntersalLogo';

interface NavbarProps {
  activePort: PortConfig;
  onSelectPort: (portId: 'areia_branca' | 'macau') => void;
  activeTab: 'dashboard' | 'table' | 'map' | 'report';
  onChangeTab: (tab: 'dashboard' | 'table' | 'map' | 'report') => void;
  currentTime: Date;
  userLocation: CustomUserLocation;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePort,
  onSelectPort,
  activeTab,
  onChangeTab,
  currentTime,
  userLocation,
}) => {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Top Info Bar */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            {/* Intersal Sala de Operação Official Logo */}
            <div className="w-11 h-11 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center shrink-0 border border-emerald-500/40">
              <IntersalLogo className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                  Sala de Controle - Marés
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                <span className="font-medium text-slate-300">Areia Branca & Macau - RN</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {/* Live Clock */}
            <div className="flex flex-col text-right font-mono bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/60">
              <span className="text-xs font-bold text-slate-100">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} <span className="text-[10px] text-cyan-400 font-normal">BRT (UTC-3)</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Port Selector Bar */}
        <div className="py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Port Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800 max-w-fit">
            <button
              id="port-select-areia-branca"
              onClick={() => onSelectPort('areia_branca')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activePort.id === 'areia_branca'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Anchor className="w-3.5 h-3.5" />
              Areia Branca - RN
            </button>
            <button
              id="port-select-macau"
              onClick={() => onSelectPort('macau')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activePort.id === 'macau'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Macau - RN
            </button>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              id="nav-tab-dashboard"
              onClick={() => onChangeTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              Painel em Tempo Real
            </button>

            <button
              id="nav-tab-map"
              onClick={() => onChangeTab('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'map'
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Mapa Náutico Georreferenciado
            </button>

            <button
              id="nav-tab-table"
              onClick={() => onChangeTab('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'table'
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Tábua de Marés
            </button>

            <button
              id="nav-tab-report"
              onClick={() => onChangeTab('report')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'report'
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Boletim Informativo
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
