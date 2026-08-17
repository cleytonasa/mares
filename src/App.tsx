import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CurrentTideCard } from './components/CurrentTideCard';
import { TideChart24h } from './components/TideChart24h';
import { BarControlPanel } from './components/BarControlPanel';
import { WeatherWidget } from './components/WeatherWidget';
import { InteractiveNauticalMap } from './components/InteractiveNauticalMap';
import { TideTableMonthly } from './components/TideTableMonthly';
import { InformativoGenerator } from './components/InformativoGenerator';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { VesselTrafficTracker } from './components/VesselTrafficTracker';
import { ManualLocationModal } from './components/ManualLocationModal';
import { PORTS_DATA } from './data/portsData';
import { PortConfig, WeatherData, AlertThresholds, BarStatusType, VesselAIS, CustomUserLocation } from './types/maritime';
import { INITIAL_VESSELS, INITIAL_USER_LOCATION, calculateDistanceNM } from './data/vesselTrafficData';
import { calculateCurrentTide } from './utils/tideCalculations';
import { fetchPortWeather } from './services/weatherService';
import { ShieldCheck, AlertTriangle, AlertOctagon, Anchor, MapPin, Compass, ArrowRight, Ship, Crosshair } from 'lucide-react';

const DEFAULT_THRESHOLDS: AlertThresholds = {
  minTideHeight: 1.0,
  minUnderKeelClearance: 0.6,
  maxWindKnots: 22,
  maxWaveHeightMeters: 1.8,
  soundAlertEnabled: false,
  autoRefreshInterval: 300,
};

export default function App() {
  const [selectedPortId, setSelectedPortId] = useState<'areia_branca' | 'macau'>('areia_branca');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'bar_control' | 'map' | 'vessels' | 'report'>('dashboard');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Custom User Location state (manual or GPS)
  const [userLocation, setUserLocation] = useState<CustomUserLocation>(INITIAL_USER_LOCATION);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Vessels AIS state
  const [vessels, setVessels] = useState<VesselAIS[]>(INITIAL_VESSELS);
  const [selectedVesselOnMap, setSelectedVesselOnMap] = useState<VesselAIS | null>(null);

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  // Vessel draft for chart threshold
  const [vesselDraft, setVesselDraft] = useState<number>(3.2);

  // Alerts
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);

  const activePort: PortConfig = PORTS_DATA[selectedPortId];
  const effectiveTime = simulatedTime || currentTime;

  // Real-time clock interval & simulated minor AIS vessel heading drift
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather when port or user location changes
  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const data = await fetchPortWeather(userLocation.lat, userLocation.lng);
      setWeather(data);
    } catch (err) {
      console.error('Weather load error:', err);
    } finally {
      setWeatherLoading(false);
    }
  }, [userLocation.lat, userLocation.lng]);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, thresholds.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [loadWeather, thresholds.autoRefreshInterval]);

  // Current calculated tide
  const currentTideState = calculateCurrentTide(effectiveTime, activePort);

  // Compute Bar Status
  const currentTotalDepth = activePort.criticalShallowDepth + currentTideState.currentHeight;
  const underKeelClearance = currentTotalDepth - vesselDraft;

  let barStatus: BarStatusType = 'OPEN';
  const activeAlerts: string[] = [];

  if (underKeelClearance < 0) {
    barStatus = 'CLOSED';
    activeAlerts.push(`Calado insuficiente na barra de ${activePort.name} (Falta ${(Math.abs(underKeelClearance)).toFixed(2)}m)`);
  } else if (underKeelClearance < thresholds.minUnderKeelClearance) {
    barStatus = 'RESTRICTED';
    activeAlerts.push(`Folga de quilha crítica (${underKeelClearance.toFixed(2)}m < ${thresholds.minUnderKeelClearance}m)`);
  } else if (weather && weather.windSpeedKnots >= thresholds.maxWindKnots) {
    barStatus = 'CAUTION';
    activeAlerts.push(`Vento forte na foz (${weather.windSpeedKnots} nós > limite de ${thresholds.maxWindKnots} nós)`);
  } else if (currentTideState.currentHeight < thresholds.minTideHeight) {
    barStatus = 'CAUTION';
    activeAlerts.push(`Maré baixa crítica (${currentTideState.currentHeight.toFixed(2)}m < ${thresholds.minTideHeight}m)`);
  }

  const handleSelectTimeFromChart = (time: Date) => {
    setSimulatedTime(time);
    setSelectedDate(time);
  };

  const handleResetSimulation = () => {
    setSimulatedTime(null);
    setSelectedDate(new Date());
  };

  const handleSelectVesselAndOpenMap = (vsl: VesselAIS) => {
    setSelectedVesselOnMap(vsl);
    setActiveTab('map');
  };

  // Find nearest vessel to user's location
  const nearestVessel = [...vessels].sort((a, b) => {
    const distA = calculateDistanceNM(userLocation.lat, userLocation.lng, a.lat, a.lng);
    const distB = calculateDistanceNM(userLocation.lat, userLocation.lng, b.lat, b.lng);
    return distA - distB;
  })[0];

  const nearestVesselDist = nearestVessel
    ? calculateDistanceNM(userLocation.lat, userLocation.lng, nearestVessel.lat, nearestVessel.lng)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-16">
      {/* Top Navbar */}
      <Navbar
        activePort={activePort}
        onSelectPort={(portId) => {
          setSelectedPortId(portId);
          setSimulatedTime(null);
        }}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        currentTime={currentTime}
        barStatus={barStatus}
        onOpenAlerts={() => setIsAlertModalOpen(true)}
        unreadAlertCount={activeAlerts.length}
        userLocation={userLocation}
        onOpenManualLocationModal={() => setIsLocationModalOpen(true)}
        vesselCount={vessels.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-6">
        {/* Active Alert Banner */}
        {activeAlerts.length > 0 && (
          <div className="p-3.5 bg-amber-950/50 border border-amber-500/50 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-200 shadow-lg animate-pulse">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold uppercase tracking-wider block text-amber-300">
                  Aviso Operacional de Barra Ativo
                </span>
                <span>{activeAlerts.join(' • ')}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('bar_control')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition shrink-0 flex items-center gap-1"
            >
              Verificar Calado
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Real-time Tide Gauge Card */}
            <CurrentTideCard
              tideState={currentTideState}
              port={activePort}
              currentTime={effectiveTime}
              isSimulated={Boolean(simulatedTime)}
              onResetSimulation={handleResetSimulation}
            />

            {/* Quick AIS & Position Bar */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                  <Crosshair className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-sans">
                    Sua Referência Geográfica:
                  </span>
                  <span className="font-bold text-white text-sm">
                    {userLocation.dmsLat} {userLocation.dmsLng}
                  </span>
                  <span className="text-[11px] text-cyan-400 ml-2">({userLocation.name})</span>
                </div>
              </div>

              {nearestVessel && (
                <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
                  <Ship className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Embarcação Mais Próxima:</span>
                    <span className="font-bold text-white">{nearestVessel.name}</span>
                    <span className="text-cyan-300 ml-1.5">({nearestVesselDist} NM)</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
                >
                  Setar Coordenadas
                </button>
                <button
                  onClick={() => setActiveTab('vessels')}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
                >
                  <Ship className="w-3.5 h-3.5" />
                  Ver Tráfego AIS ({vessels.length})
                </button>
              </div>
            </div>

            {/* Weather Marine Widget */}
            <WeatherWidget
              weather={weather}
              loading={weatherLoading}
              port={activePort}
              onRefresh={loadWeather}
            />

            {/* 24h Harmonic Variation Curve */}
            <TideChart24h
              port={activePort}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              currentTime={effectiveTime}
              vesselDraft={vesselDraft}
              onSelectTime={handleSelectTimeFromChart}
            />

            {/* Quick Actions / Highlights Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('vessels')}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer transition shadow-lg group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Tráfego Marítimo
                  </span>
                  <Ship className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
                </div>
                <h4 className="text-base font-bold text-white">AIS & Embarcações</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Monitore barcaças salineiras, rebocadores e navios Panamax no canal e TERMISA.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('bar_control')}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer transition shadow-lg group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Simulador de Calado
                  </span>
                  <Anchor className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
                </div>
                <h4 className="text-base font-bold text-white">Controle de Barra & Squat</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Calcule folga abaixo da quilha (FAQ) para barcaças salineiras, pesqueiros e rebocadores.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('map')}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer transition shadow-lg group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Carta Náutica
                  </span>
                  <MapPin className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
                </div>
                <h4 className="text-base font-bold text-white">Mapa & Satélite</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Visualize o canal de Areia Branca (TERMISA), Barra de Macau e sua posição exata.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('report')}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer transition shadow-lg group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Despacho & Rádio
                  </span>
                  <Compass className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
                </div>
                <h4 className="text-base font-bold text-white">Boletim WhatsApp / VHF</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Gere o informativo oficial de marés, ventos e profundidades com 1 clique.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Vessel Traffic & AIS Monitoring */}
        {activeTab === 'vessels' && (
          <VesselTrafficTracker
            vessels={vessels}
            userLocation={userLocation}
            currentTide={currentTideState}
            activePort={activePort}
            onSelectVesselOnMap={handleSelectVesselAndOpenMap}
            onOpenManualLocationModal={() => setIsLocationModalOpen(true)}
          />
        )}

        {/* Tab 3: Bar Control & Draft Calculator */}
        {activeTab === 'bar_control' && (
          <BarControlPanel
            port={activePort}
            tideState={currentTideState}
            weather={weather}
            currentTime={effectiveTime}
            onUpdateDraft={setVesselDraft}
          />
        )}

        {/* Tab 4: Interactive Map */}
        {activeTab === 'map' && (
          <InteractiveNauticalMap
            port={activePort}
            tideState={currentTideState}
            userLocation={userLocation}
            vessels={vessels}
            selectedVessel={selectedVesselOnMap}
            onSelectPort={setSelectedPortId}
            onUpdateUserLocation={setUserLocation}
            onOpenManualLocationModal={() => setIsLocationModalOpen(true)}
            onSelectVessel={setSelectedVesselOnMap}
          />
        )}

        {/* Tab 5: 2026 DHN Monthly Table */}
        {activeTab === 'table' && (
          <TideTableMonthly
            port={activePort}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSimulatedTime(d);
              setActiveTab('dashboard');
            }}
          />
        )}

        {/* Tab 6: Maritime Bulletin / Informativo */}
        {activeTab === 'report' && (
          <InformativoGenerator
            port={activePort}
            selectedDate={selectedDate}
            weather={weather}
            currentTime={effectiveTime}
          />
        )}
      </main>

      {/* Manual Location Modal */}
      <ManualLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onUpdateLocation={setUserLocation}
        onEnableMapClickMode={() => {
          setActiveTab('map');
        }}
      />

      {/* Alert Thresholds Modal */}
      <AlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        thresholds={thresholds}
        onSaveThresholds={setThresholds}
      />
    </div>
  );
}

