import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Crosshair,
} from 'lucide-react';
import { PortConfig, CustomUserLocation } from '../types/maritime';
import { CurrentTideState } from '../utils/tideCalculations';
import { decimalToDMS } from '../data/vesselTrafficData';

interface InteractiveNauticalMapProps {
  port: PortConfig;
  tideState: CurrentTideState;
  userLocation: CustomUserLocation;
  onSelectPort: (portId: 'areia_branca' | 'macau') => void;
  onUpdateUserLocation: (newLoc: CustomUserLocation) => void;
}

export const InteractiveNauticalMap: React.FC<InteractiveNauticalMapProps> = ({
  port,
  tideState,
  userLocation,
  onSelectPort,
  onUpdateUserLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'nautical'>('nautical');
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Handle map clicks to set manual location
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        const dmsLat = decimalToDMS(lat, true);
        const dmsLng = decimalToDMS(lng, false);

        onUpdateUserLocation({
          lat,
          lng,
          name: `Posição Marcada (${dmsLat} ${dmsLng})`,
          dmsLat,
          dmsLng,
          isManual: true,
          estimatedBaseZHDepth: 4.5,
        });
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if unmounted
    };
  }, []);

  // Update Layers & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing overlay layers
    map.eachLayer((layer) => {
      if (
        layer instanceof L.TileLayer ||
        layer instanceof L.Marker ||
        layer instanceof L.Polygon ||
        layer instanceof L.Polyline ||
        layer instanceof L.Circle
      ) {
        map.removeLayer(layer);
      }
    });

    // 1. Base Tile Layer
    if (mapType === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri World Imagery, DigitalGlobe',
        maxZoom: 18,
      }).addTo(map);
    } else {
      // Nautical Chart (OpenSeaMap overlays)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; OpenSeaMap contributors',
        maxZoom: 18,
      }).addTo(map);
    }

    // 2. Navigation Channel & Regional Navigational Features
    const termisaOffshoreCoords: [number, number] = [-4.825, -37.040];
    const pontaUpanemaCoords: [number, number] = [-4.912, -37.135];
    const fozRioMossoroCoords: [number, number] = [-4.955, -37.142];
    const portoAreiaBrancaCoords: [number, number] = [-4.958, -37.133];

    const macauBarraCoords: [number, number] = [-5.0683, -36.6342];

    // Helper for Div Icons
    const createPOI_Icon = (color: string, iconStr: string, label: string) => {
      return L.divIcon({
        className: 'custom-leaflet-poi',
        html: `
          <div style="background: ${color}; color: white; padding: 4px 8px; border-radius: 8px; font-weight: bold; font-size: 11px; font-family: monospace; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span>${iconStr}</span>
            <span>${label}</span>
          </div>
        `,
        iconSize: [130, 30],
        iconAnchor: [65, 15],
      });
    };

    // Areia Branca Points
    L.marker(termisaOffshoreCoords, {
      icon: createPOI_Icon('#0284c7', '🏝️', 'TERMISA (Ilha Salineira)'),
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #0284c7;">TERMISA - Terminal Salineiro</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Ilha artificial a 14km da costa</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Calado máximo: 15.0m (Berço de Navios)</p>
      </div>
    `);

    L.marker(pontaUpanemaCoords, {
      icon: createPOI_Icon('#eab308', '⚠️', 'Barra da Ponta do Upanema'),
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #ca8a04;">Barra da Ponta do Upanema</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Profundidade crítica no ZH: 2.2 metros</p>
      </div>
    `);

    L.marker(portoAreiaBrancaCoords, {
      icon: createPOI_Icon('#475569', '⚓', 'Porto de Areia Branca'),
    }).addTo(map);

    // Channel Polyline (Areia Branca)
    const areiaBrancaChannel: [number, number][] = [
      fozRioMossoroCoords,
      pontaUpanemaCoords,
      [-4.86, -37.08],
      [-4.82236, -37.04381],
      termisaOffshoreCoords,
    ];
    L.polyline(areiaBrancaChannel, {
      color: '#22d3ee',
      weight: 3,
      dashArray: '6 6',
      opacity: 0.9,
    }).addTo(map);

    // Macau Features
    L.marker(macauBarraCoords, {
      icon: createPOI_Icon('#06b6d4', '🌊', 'Barra de Macau (Rio Açu)'),
    }).addTo(map);

    L.circle(pontaUpanemaCoords, {
      radius: 1200,
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.2,
      weight: 1.5,
    }).addTo(map);

    L.circle(macauBarraCoords, {
      radius: 1500,
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.2,
      weight: 1.5,
    }).addTo(map);

    // 3. User's Manual Position (Beacon with Pulse)
    const userMarkerIcon = L.divIcon({
      className: 'user-beacon-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #06b6d4; border: 3px solid #ffffff; box-shadow: 0 0 15px #06b6d4; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
            📍
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userMarkerIcon,
      zIndexOffset: 1000,
      draggable: true,
    }).addTo(map);

    userMarker.on('dragend', (e) => {
      const latlng = (e.target as L.Marker).getLatLng();
      const lat = Number(latlng.lat.toFixed(6));
      const lng = Number(latlng.lng.toFixed(6));
      const dmsLat = decimalToDMS(lat, true);
      const dmsLng = decimalToDMS(lng, false);

      onUpdateUserLocation({
        lat,
        lng,
        name: `Posição Arrastada (${dmsLat})`,
        dmsLat,
        dmsLng,
        isManual: true,
        estimatedBaseZHDepth: 4.5,
      });
    });

    userMarker.bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 6px; min-width: 200px;">
        <div style="display: flex; align-items: center; gap: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
          <span style="font-size: 14px;">📍</span>
          <h4 style="margin: 0; font-weight: bold; color: #0891b2; font-size: 13px;">${userLocation.name}</h4>
        </div>
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; font-family: monospace;">
          ${userLocation.dmsLat} ${userLocation.dmsLng}
        </p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">
          Lâmina d'água estimada: <strong style="color: #0891b2;">${(userLocation.estimatedBaseZHDepth + tideState.currentHeight).toFixed(2)}m</strong>
        </p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #94a3b8; font-style: italic;">
          (Dica: Arraste este pino ou clique no mapa para mudar)
        </p>
      </div>
    `);

    // Range rings from user location (1 NM, 3 NM, 5 NM)
    if (showRangeRings) {
      const nm1InMeters = 1852;
      L.circle([userLocation.lat, userLocation.lng], {
        radius: nm1InMeters,
        color: '#06b6d4',
        fill: false,
        dashArray: '4 4',
        weight: 1,
      }).addTo(map);

      L.circle([userLocation.lat, userLocation.lng], {
        radius: nm1InMeters * 3,
        color: '#06b6d4',
        fill: false,
        dashArray: '4 6',
        weight: 1,
        opacity: 0.6,
      }).addTo(map);

      L.circle([userLocation.lat, userLocation.lng], {
        radius: nm1InMeters * 5,
        color: '#06b6d4',
        fill: false,
        dashArray: '4 8',
        weight: 1,
        opacity: 0.4,
      }).addTo(map);
    }
  }, [port, mapType, userLocation, showRangeRings, tideState.currentHeight]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl text-slate-100 space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wide text-cyan-400 uppercase flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Carta Náutica & Posicionamento Georreferenciado
            </h3>
            {userLocation.isManual && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                POSIÇÃO MANUAL ATIVA
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Sua Posição: <strong className="text-white">{userLocation.dmsLat} {userLocation.dmsLng}</strong> ({userLocation.name})
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Map Layer Switcher */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                mapType === 'satellite' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satélite
            </button>
            <button
              onClick={() => setMapType('nautical')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                mapType === 'nautical' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Carta Náutica
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Live Depth Overlay Card in Top-Left */}
        <div className="absolute top-4 left-4 z-10 bg-slate-950/90 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur text-xs font-mono text-slate-200 pointer-events-auto">
          <span className="text-[10px] uppercase text-cyan-400 font-bold block">
            Monitoramento no Seu Ponto
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {(userLocation.estimatedBaseZHDepth + tideState.currentHeight).toFixed(2)} m
            </span>
            <span className="text-[11px] text-slate-400">lâmina total</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Maré: +{tideState.currentHeight.toFixed(2)}m • Fundo ZH: {userLocation.estimatedBaseZHDepth}m
          </div>
          <div className="text-[9px] text-cyan-300 mt-1 font-sans">
            💡 Dica: Clique no mapa para mover seu ponto
          </div>
        </div>

        {/* Map Rings Toggle Overlay in Top-Right */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-slate-950/90 border border-slate-700 p-2 rounded-xl text-xs font-mono backdrop-blur">
          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showRangeRings}
              onChange={(e) => setShowRangeRings(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span>Anéis de Alcance (1, 3, 5 NM)</span>
          </label>
        </div>

        {/* Quick Port Focus Buttons in Bottom-Left */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-2 flex-wrap">
          <button
            onClick={() => {
              onSelectPort('areia_branca');
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([-4.825, -37.040], 12);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur transition border ${
              port.id === 'areia_branca'
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Focar Areia Branca (TERMISA)
          </button>
          <button
            onClick={() => {
              onSelectPort('macau');
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([-5.0683, -36.6342], 12);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur transition border ${
              port.id === 'macau'
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Focar Macau - RN
          </button>
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14);
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur transition border bg-slate-900/90 text-cyan-300 border-cyan-500/50 hover:bg-slate-800 flex items-center gap-1"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Minha Posição
          </button>
        </div>
      </div>

      {/* Map Legend */}
      <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-500 border border-white inline-block shadow-sm" />
            Minha Posição / Marcador
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
            TERMISA (Ilha Salineira)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Banco Crítico / Barra da Ponta do Upanema
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            Barra de Macau (Rio Açu)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border-b-2 border-cyan-400 border-dashed inline-block w-4" />
            Canal de Navegação Balizado
          </span>
        </div>

        <span className="text-slate-500 font-mono text-[11px]">
          WGS84 / Coordenadas Náuticas em Graus, Minutos e Segundos
        </span>
      </div>
    </div>
  );
};
