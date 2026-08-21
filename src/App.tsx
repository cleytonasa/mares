import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CurrentTideCard } from './components/CurrentTideCard';
import { TideChart24h } from './components/TideChart24h';
import { WeeklyWeatherForecast } from './components/WeeklyWeatherForecast';
import { InteractiveNauticalMap } from './components/InteractiveNauticalMap';
import { TideTableMonthly } from './components/TideTableMonthly';
import { InformativoGenerator } from './components/InformativoGenerator';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { PORTS_DATA } from './data/portsData';
import { PortConfig, WeatherData, AlertThresholds, CustomUserLocation } from './types/maritime';
import { INITIAL_USER_LOCATION, decimalToDMS } from './data/vesselTrafficData';
import { calculateCurrentTide } from './utils/tideCalculations';
import { fetchPortWeather } from './services/weatherService';
import { AlertTriangle, MapPin, Compass, Table, Crosshair, CloudSun, Map } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'map' | 'report'>('dashboard');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Custom User Location state (starts with default, attempts real GPS)
  const [userLocation, setUserLocation] = useState<CustomUserLocation>(INITIAL_USER_LOCATION);

  // Attempt real device GPS location on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const dmsLat = decimalToDMS(lat, true);
          const dmsLng = decimalToDMS(lng, false);
          const accuracy = Math.round(pos.coords.accuracy || 0);

          setUserLocation({
            lat,
            lng,
            name: `Localização Real do Dispositivo (±${accuracy}m)`,
            dmsLat,
            dmsLng,
            isManual: false,
            estimatedBaseZHDepth: 4.0,
          });
        },
        () => {
          // Keep default if permission denied or unavailable
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  // Alerts
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);

  const activePort: PortConfig = PORTS_DATA[selectedPortId];
  const effectiveTime = simulatedTime || currentTime;

  // Real-time clock interval
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

  // Active Environmental Alerts
  const activeAlerts: string[] = [];
  const gustKmH = weather ? Math.round(weather.windGustKnots * 1.852) : 0;
  if (gustKmH >= 60) {
    activeAlerts.push(`ALERTA CRÍTICO: Rajada de vento severa de ${gustKmH} km/h (${weather?.windGustKnots} nós) acima do limite de segurança (60 km/h)`);
  } else if (weather && weather.windSpeedKnots >= thresholds.maxWindKnots) {
    activeAlerts.push(`Vento forte na região (${weather.windSpeedKnots} nós > limite de ${thresholds.maxWindKnots} nós)`);
  }
  if (weather && weather.waveHeightMeters >= thresholds.maxWaveHeightMeters) {
    activeAlerts.push(`Ondulação elevada (${weather.waveHeightMeters}m > limite de ${thresholds.maxWaveHeightMeters}m)`);
  }
  if (currentTideState.currentHeight < thresholds.minTideHeight) {
    activeAlerts.push(`Maré baixa crítica (${currentTideState.currentHeight.toFixed(2)}m < ${thresholds.minTideHeight}m)`);
  }

  const handleResetSimulation = () => {
    setSimulatedTime(null);
    setSelectedDate(new Date());
  };

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
        userLocation={userLocation}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 pt-3 sm:pt-5 space-y-3.5 sm:space-y-6">
        {/* Active Alert Banner */}
        {activeAlerts.length > 0 && (
          <div className="p-2.5 sm:p-3.5 bg-amber-950/50 border border-amber-500/50 rounded-xl sm:rounded-2xl flex items-center gap-2.5 sm:gap-3 text-xs text-amber-200 shadow-lg">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider block text-[11px] sm:text-xs text-amber-300">
                Condições Meteorológicas & Maré
              </span>
              <span className="text-[11px] sm:text-xs">{activeAlerts.join(' • ')}</span>
            </div>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3.5 sm:space-y-6">
            {/* 1. Real-time Tide Gauge Card with Integrated Wind & Marine Conditions */}
            <CurrentTideCard
              tideState={currentTideState}
              port={activePort}
              currentTime={effectiveTime}
              weather={weather}
              isSimulated={Boolean(simulatedTime)}
              onResetSimulation={handleResetSimulation}
            />

            {/* 2. 48h Harmonic Variation Curve (Curva Harmônica de Variação - 48 Horas) */}
            <TideChart24h
              port={activePort}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              currentTime={effectiveTime}
            />

            {/* 3. 7-Day Weekly Weather & Marine Forecast (Previsão do Tempo 7 Dias) */}
            <WeeklyWeatherForecast
              forecast={weather?.weeklyForecast}
              port={activePort}
              loading={weatherLoading}
            />

            {/* Quick Actions / Highlights Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('table')}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer transition shadow-lg group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Tábua Oficial
                  </span>
                  <Table className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
                </div>
                <h4 className="text-base font-bold text-white">DHN 2026 Mensal</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Consulte os 365 dias do ano com fases lunares, sizígias e quadraturas da Marinha.
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
                  <Map className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
                </div>
                <h4 className="text-base font-bold text-white">Mapa & Satélite</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Visualize o canal de Areia Branca (TERMISA), Barra de Macau e sua posição exata.
                </p>
              </div>

              <div
                onClick={() => loadWeather()}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer transition shadow-lg group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Meteorologia Marinha
                  </span>
                  <CloudSun className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
                </div>
                <h4 className="text-base font-bold text-white">Ventos & Ondas</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Direção e velocidade dos ventos alísios (SE/E), rajadas, pressão atmosférica e ondas.
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
                  Gere o informativo oficial de marés, ventos e previsões com 1 clique para envio.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Map */}
        {activeTab === 'map' && (
          <InteractiveNauticalMap
            port={activePort}
            tideState={currentTideState}
            userLocation={userLocation}
            onSelectPort={setSelectedPortId}
            onUpdateUserLocation={setUserLocation}
          />
        )}

        {/* Tab 3: 2026 DHN Monthly Table */}
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

        {/* Tab 4: Maritime Bulletin / Informativo */}
        {activeTab === 'report' && (
          <InformativoGenerator
            port={activePort}
            selectedDate={selectedDate}
            weather={weather}
            currentTime={effectiveTime}
          />
        )}
      </main>

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
