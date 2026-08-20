import { TideAnnotation } from '../types/maritime';
import { createBargeDateTimeString, formatBargeDate } from '../utils/dateUtils';

const STORAGE_KEY = 'tide_annotations_fleet_v5';
const OPERATOR_AUTH_KEY = 'tide_operator_authorized_v1';

// Base64 encoding/decoding helper that handles UTF-8 safely
function encodeAnnotationsToUrl(list: TideAnnotation[]): string {
  try {
    const json = JSON.stringify(list);
    return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  } catch (e) {
    console.error('Failed to encode annotations:', e);
    return '';
  }
}

function decodeAnnotationsFromUrl(encoded: string): TideAnnotation[] | null {
  try {
    const decodedStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const parsed = JSON.parse(decodedStr);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to decode annotations from URL:', e);
  }
  return null;
}

export const getSavedAnnotations = (): TideAnnotation[] => {
  try {
    // 1. Check if URL has a shared fleet parameter (e.g. ?frota=... or ?fleet=...)
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const urlFrota = params.get('frota') || params.get('fleet');
      if (urlFrota) {
        const decoded = decodeAnnotationsFromUrl(urlFrota);
        if (decoded && decoded.length > 0) {
          // Persist to localStorage for future visits
          localStorage.setItem(STORAGE_KEY, JSON.stringify(decoded));
          return decoded;
        }
      }
    }

    // 2. Check LocalStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 3. Fallback to default realistic seed
    return getDefaultSeedAnnotations();
  } catch (e) {
    console.error('Failed to parse annotations:', e);
    return getDefaultSeedAnnotations();
  }
};

export const saveAnnotationsToStorage = (list: TideAnnotation[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Dispatch custom event for same-tab / multi-component sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tide_annotations_updated', { detail: list }));
    }
  } catch (e) {
    console.error('Failed to save annotations:', e);
  }
};

export const generateShareableFleetUrl = (list: TideAnnotation[]): string => {
  if (typeof window === 'undefined') return '';
  const encoded = encodeAnnotationsToUrl(list);
  const url = new URL(window.location.href);
  url.searchParams.set('frota', encoded);
  return url.toString();
};

export const isOperatorAuthorizedSession = (): boolean => {
  try {
    return sessionStorage.getItem(OPERATOR_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setOperatorAuthorizedSession = (val: boolean): void => {
  try {
    if (val) {
      sessionStorage.setItem(OPERATOR_AUTH_KEY, 'true');
    } else {
      sessionStorage.removeItem(OPERATOR_AUTH_KEY);
    }
  } catch (e) {
    console.error('Failed to set operator session:', e);
  }
};

// Provide realistic initial barge schedule with strict local times (02:20 e 14:30)
function getDefaultSeedAnnotations(): TideAnnotation[] {
  const today = new Date();
  const dateStr = formatBargeDate(today);

  return [
    {
      id: 'demo-barge-1',
      portId: 'areia_branca',
      title: 'Dona Yolanda',
      category: 'barcaca',
      bargeStatus: 'Operação de Descarga',
      dateTime: createBargeDateTimeString(dateStr, '02:20'),
      estimatedDraft: 2.8,
      notes: 'Canal de Areia Branca - VHF Ch 16/11',
      color: '#38bdf8',
      createdAt: createBargeDateTimeString(dateStr, '00:00'),
    },
    {
      id: 'demo-barge-2',
      portId: 'areia_branca',
      title: 'Cmt Paschoal',
      category: 'barcaca',
      bargeStatus: 'No largo / Aguardando',
      dateTime: createBargeDateTimeString(dateStr, '14:30'),
      estimatedDraft: 2.75,
      notes: 'Aguardando próxima preamar na barra',
      color: '#3b82f6',
      createdAt: createBargeDateTimeString(dateStr, '00:00'),
    },
  ];
}

