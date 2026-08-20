export interface TideEvent {
  time: string; // HH:mm format, e.g. "02:12"
  height: number; // in meters, e.g. 3.26
  type: 'high' | 'low';
}

export type MoonPhase = 'new' | 'first_quarter' | 'full' | 'last_quarter' | null;

export interface DayTides {
  day: number;
  month: number; // 1 - 12
  year: number; // 2026
  dayOfWeek: string; // DOM, SEG, TER, QUA, QUI, SEX, SÁB
  moonPhase?: MoonPhase;
  events: TideEvent[];
}

export interface PortConfig {
  id: 'areia_branca' | 'macau';
  name: string;
  fullName: string;
  state: string;
  chartNumber: string;
  dhnStation: string;
  coordinates: {
    lat: number;
    lng: number;
    dmsLat: string;
    dmsLng: string;
  };
  meanLevel: number; // Nível Médio (m)
  chartDatum: number; // Zero Hidrográfico (m)
  criticalShallowDepth: number; // Profundidade do banco de areia no ZH (m)
  maxNormalDraft: number; // Calado operacional recomendado (m)
  timeOffsetMinutes: number; // Offset relative to Termisa
  heightMultiplier: number;
  description: string;
  barCharacteristics: string;
}

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  pressure: number;
  windSpeedKmH: number;
  windSpeedKnots: number;
  windDirection: number;
  windDirectionLabel: string;
  windGustKnots: number;
  waveHeightMeters: number;
  wavePeriodSeconds: number;
  waveDirection: number;
  visibilityKm: number;
  uvIndex: number;
  precipitationProb: number;
  weatherCode: number;
  weatherDescription: string;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  nauticalDawn: string;
  nauticalDusk: string;
  lastUpdated: string;
}

export interface VesselParameters {
  name: string;
  vesselType: 'salineiro' | 'pesqueiro' | 'rebocador' | 'graneleiro' | 'lancha';
  draftMeters: number; // Calado (m)
  speedKnots: number; // Velocidade
  squatMarginMeters: number; // Efeito Squat estimado (m)
  safetyMarginMeters: number; // Folga de segurança mínima requerida (m)
}

export interface AlertThresholds {
  minTideHeight: number; // Alerta de maré baixa (m)
  minUnderKeelClearance: number; // FAQ mínima (m)
  maxWindKnots: number; // Limite de vento para travessia de barra (nós)
  maxWaveHeightMeters: number; // Limite de onda na arrebentação (m)
  soundAlertEnabled: boolean;
  autoRefreshInterval: number; // em segundos
}

export type BarStatusType = 'OPEN' | 'CAUTION' | 'RESTRICTED' | 'CLOSED';

export type VesselCategory = 'barcaca' | 'rebocador' | 'navio' | 'praticagem' | 'pesqueiro' | 'offshore';

export interface VesselAIS {
  id: string;
  name: string;
  type: VesselCategory;
  typeName: string;
  mmsi: string;
  callSign: string;
  imo?: string;
  flag: string;
  lat: number;
  lng: number;
  dmsLat: string;
  dmsLng: string;
  heading: number; // COG (0 - 359°)
  speedKnots: number; // SOG
  draftMeters: number; // Calado
  lengthMeters: number; // LOA
  beamMeters: number; // Boca
  status: 'Navegando no Canal' | 'Fundeado' | 'Operando no TERMISA' | 'Manobra de Reboque' | 'Espera de Maré' | 'Atracado no Cais' | 'Patrulha / Apoio';
  destination: string;
  eta: string;
  vhfChannel: string;
  lastAisUpdate: string;
  cargo?: string;
}

export interface CustomUserLocation {
  lat: number;
  lng: number;
  name: string;
  dmsLat: string;
  dmsLng: string;
  isManual: boolean;
  estimatedBaseZHDepth: number; // Profundidade do fundo no ZH em metros
}

export interface BarStatusEvaluation {
  status: BarStatusType;
  title: string;
  message: string;
  reasons: string[];
  currentWaterDepth: number;
  effectiveClearance: number;
  isSafeForDraft: boolean;
  nextSafeWindow?: {
    start: string;
    end: string;
    maxHeight: number;
  };
}

export type AnnotationCategory = 'barcaca' | 'rebocador' | 'navio' | 'faina' | 'calado' | 'aviso';

export type BargeTripStatus = 
  | 'Finalizada'
  | 'Operação de Descarga'
  | 'No largo / Aguardando';

export interface TideAnnotation {
  id: string;
  portId: 'areia_branca' | 'macau';
  dateTime: string; // ISO String format e.g. "2026-08-20T14:30:00"
  title: string; // e.g. "Dona Yolanda", "Navio Graneleiro"
  category: AnnotationCategory;
  bargeStatus?: BargeTripStatus;
  estimatedDraft?: number; // Calado em metros ex: 2.8
  notes?: string; // Observações da manobra
  color?: string;
  createdBy?: string;
  createdAt: string;
}

export const BARGE_FLEET_PRESETS = [
  { id: 'b1', name: 'Dona Yolanda', type: 'barcaca', defaultDraft: 2.8, color: '#38bdf8' },
  { id: 'b2', name: 'Dona Zita', type: 'barcaca', defaultDraft: 2.8, color: '#06b6d4' },
  { id: 'b3', name: 'Cmt Paschoal', type: 'barcaca', defaultDraft: 2.8, color: '#3b82f6' },
  { id: 'b4', name: 'N.S das Vitórias', type: 'barcaca', defaultDraft: 2.8, color: '#6366f1' },
  { id: 'b5', name: 'Porto de Galinhos', type: 'barcaca', defaultDraft: 2.8, color: '#8b5cf6' },
  { id: 'reb', name: 'Rebocador de Apoio', type: 'rebocador', defaultDraft: 2.2, color: '#f59e0b' },
  { id: 'nav', name: 'Navio Graneleiro', type: 'navio', defaultDraft: 7.5, color: '#ec4899' },
  { id: 'fai', name: 'Faina de Carregamento', type: 'faina', defaultDraft: 0, color: '#10b981' },
  { id: 'cal', name: 'Janela de Calado', type: 'calado', defaultDraft: 3.2, color: '#14b8a6' },
  { id: 'avi', name: 'Aviso Operacional', type: 'aviso', defaultDraft: 0, color: '#f43f5e' },
];
