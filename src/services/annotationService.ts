import { TideAnnotation } from '../types/maritime';

const STORAGE_KEY = 'tide_annotations_fleet_v4';
const OPERATOR_AUTH_KEY = 'tide_operator_authorized_v1';

export const getSavedAnnotations = (): TideAnnotation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSeedAnnotations();
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse annotations:', e);
    return getDefaultSeedAnnotations();
  }
};

export const saveAnnotationsToStorage = (list: TideAnnotation[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save annotations:', e);
  }
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

// Provide realistic initial barge schedule on first access
function getDefaultSeedAnnotations(): TideAnnotation[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  // Preset 2 active operations for test / demonstration
  const d1 = new Date(year, month, day, 14, 30, 0);
  const d2 = new Date(year, month, day, 20, 45, 0);

  return [
    {
      id: 'demo-barge-1',
      portId: 'areia_branca',
      title: 'Dona Yolanda',
      category: 'barcaca',
      bargeStatus: 'No largo / Aguardando',
      dateTime: d1.toISOString(),
      estimatedDraft: 2.8,
      notes: '',
      color: '#38bdf8',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-barge-2',
      portId: 'areia_branca',
      title: 'Cmt Paschoal',
      category: 'barcaca',
      bargeStatus: 'Operação de Descarga',
      dateTime: d2.toISOString(),
      estimatedDraft: 2.75,
      notes: '',
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
    },
  ];
}
