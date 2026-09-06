import { SaltShipmentVessel, MonthlySaltSummary } from '../data/saltShipmentsData';
import { SALT_SHIPMENTS_2026, MONTHLY_SALT_SUMMARIES, OVERALL_TOTALS, LINEUP_LAST_UPDATED } from '../data/saltShipmentsData';

const STORAGE_KEY_VESSELS = 'portal_maritimo_vessels_v1';
const STORAGE_KEY_PDF = 'portal_maritimo_lineup_pdf_v1';
const STORAGE_KEY_LAST_UPDATE = 'portal_maritimo_last_updated_v1';
const STORAGE_KEY_AUTH = 'portal_maritimo_auth_v1';

export interface UploadedPDFInfo {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  pdfDate?: string; // Data oficial extraída ou indicada do PDF do Line-Up
  dataUrl: string; // Base64 data URL for direct viewing / downloading
}

// Check if credentials are valid
export function checkAdminAuth(user: string, pass: string): boolean {
  return user.trim() === 'controle' && pass === 'casa8877$';
}

export function isUserLoggedIn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  } catch {
    return false;
  }
}

export function setAdminLoggedIn(loggedIn: boolean): void {
  try {
    if (loggedIn) {
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  } catch (err) {
    console.error('Error persisting auth state:', err);
  }
}

// Load vessels from storage or fallback to built-in data
export function getManagedVessels(): SaltShipmentVessel[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VESSELS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading custom vessels:', e);
  }
  return SALT_SHIPMENTS_2026;
}

// Save vessels to localStorage (preserves the official PDF update date)
export function saveManagedVessels(vessels: SaltShipmentVessel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_VESSELS, JSON.stringify(vessels));
  } catch (e) {
    console.error('Error saving custom vessels:', e);
  }
}

// Reset vessels to factory data
export function resetManagedVessels(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_VESSELS);
    localStorage.removeItem(STORAGE_KEY_LAST_UPDATE);
  } catch (e) {
    console.error('Error resetting vessels:', e);
  }
}

// Get uploaded Line-Up PDF
export function getUploadedPDF(): UploadedPDFInfo | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PDF);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading PDF info:', e);
  }
  return null;
}

// Save uploaded Line-Up PDF and sync the official update timestamp to the PDF's date
export function saveUploadedPDF(pdfInfo: UploadedPDFInfo | null): void {
  try {
    if (pdfInfo) {
      localStorage.setItem(STORAGE_KEY_PDF, JSON.stringify(pdfInfo));
      const effectiveDate = pdfInfo.pdfDate || pdfInfo.uploadedAt;
      if (effectiveDate) {
        localStorage.setItem(STORAGE_KEY_LAST_UPDATE, effectiveDate);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_PDF);
      localStorage.removeItem(STORAGE_KEY_LAST_UPDATE);
    }
  } catch (e) {
    console.error('Error saving PDF info:', e);
  }
}

// Save or override the official Line-Up update date (from the PDF)
export function saveLineupLastUpdated(date: string): void {
  try {
    const trimmed = date.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_LAST_UPDATE, trimmed);
      const currentPdf = getUploadedPDF();
      if (currentPdf) {
        currentPdf.pdfDate = trimmed;
        localStorage.setItem(STORAGE_KEY_PDF, JSON.stringify(currentPdf));
      }
      notifyLineupChanged();
    }
  } catch (e) {
    console.error('Error saving last updated date:', e);
  }
}

// Get last updated string - always prefers the date of the official PDF document
export function getLineupLastUpdated(): string {
  try {
    const pdf = getUploadedPDF();
    if (pdf) {
      if (pdf.pdfDate && pdf.pdfDate.trim()) return pdf.pdfDate.trim();
      if (pdf.uploadedAt && pdf.uploadedAt.trim()) return pdf.uploadedAt.trim();
    }
    const custom = localStorage.getItem(STORAGE_KEY_LAST_UPDATE);
    // Ignore the transient automatic timestamp 05/09/2026 21:24 generated during testing
    if (custom && custom.trim() && custom.trim() !== '05/09/2026 21:24') {
      return custom.trim();
    }
  } catch {
    // fallback
  }
  return LINEUP_LAST_UPDATED;
}

export const LINEUP_UPDATED_EVENT = 'portal_maritimo_lineup_updated';

// Helper to notify all listening components
export function notifyLineupChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LINEUP_UPDATED_EVENT));
  }
}

// Fetch remote server data if available (cPanel PHP host)
export async function syncFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/lineup.php', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.vessels) && data.vessels.length > 0) {
        localStorage.setItem(STORAGE_KEY_VESSELS, JSON.stringify(data.vessels));
        if (data.lastUpdated) {
          localStorage.setItem(STORAGE_KEY_LAST_UPDATE, data.lastUpdated);
        }
        if (data.pdf) {
          localStorage.setItem(STORAGE_KEY_PDF, JSON.stringify(data.pdf));
        }
        notifyLineupChanged();
        return true;
      }
    }
  } catch (err) {
    // Expected if not running on PHP host or offline
  }
  return false;
}

// Save vessels and push to remote server if possible
export async function saveManagedVesselsWithRemote(
  vessels: SaltShipmentVessel[], 
  pdf?: UploadedPDFInfo | null,
  authCredentials?: { user: string; pass: string },
  customPdfDate?: string
): Promise<{ success: boolean; message: string }> {
  // First save locally
  saveManagedVessels(vessels);
  if (pdf !== undefined) {
    if (pdf && customPdfDate) {
      pdf.pdfDate = customPdfDate;
    }
    saveUploadedPDF(pdf);
  } else if (customPdfDate) {
    saveLineupLastUpdated(customPdfDate);
  }
  notifyLineupChanged();

  // Then attempt server sync if credentials available
  if (authCredentials) {
    try {
      const currentPdf = pdf !== undefined ? pdf : getUploadedPDF();
      const lastUpdateStr = customPdfDate || getLineupLastUpdated();
      const res = await fetch('/api/lineup.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: authCredentials.user,
          pass: authCredentials.pass,
          vessels,
          pdf: currentPdf,
          lastUpdated: lastUpdateStr,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.lastUpdated) {
          localStorage.setItem(STORAGE_KEY_LAST_UPDATE, json.lastUpdated);
          notifyLineupChanged();
        }
        return { success: true, message: 'Alterações salvas localmente e sincronizadas com o servidor de hospedagem!' };
      }
    } catch {
      // Ignored if purely static host
    }
  }

  return { success: true, message: 'Alterações salvas no navegador com sucesso!' };
}
export function computeMonthlySummaries(vessels: SaltShipmentVessel[]): MonthlySaltSummary[] {
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Map by month number (1 to 9 minimum)
  const summaries: MonthlySaltSummary[] = [];

  // Determine months to include (at least 1 to 9)
  for (let m = 1; m <= 9; m++) {
    // Extract vessels for month m based on ETA date "DD/MM/YYYY"
    const monthVessels = vessels.filter((v) => {
      const parts = v.eta.split('/');
      if (parts.length >= 2) {
        return parseInt(parts[1], 10) === m;
      }
      return false;
    });

    const concludedList = monthVessels.filter((v) => v.status === 'Concluído');
    const operatingList = monthVessels.filter((v) => v.status === 'Em operação');
    const plannedList = monthVessels.filter((v) => v.status === 'Previsto');

    const totalVolume = monthVessels.reduce((acc, v) => acc + (v.totalVolumeTons || 0), 0);
    const scTotal = monthVessels.reduce((acc, v) => acc + (v.scVolumeTons || 0), 0);
    const sqTotal = monthVessels.reduce((acc, v) => acc + (v.sqVolumeTons || 0), 0);

    const salinorVolume = monthVessels
      .filter((v) => v.shipper?.toUpperCase().includes('SALINOR'))
      .reduce((acc, v) => acc + (v.totalVolumeTons || 0), 0);
    const sdbVolume = monthVessels
      .filter((v) => v.shipper?.toUpperCase().includes('SDB'))
      .reduce((acc, v) => acc + (v.totalVolumeTons || 0), 0);
    const expVolume = monthVessels
      .filter((v) => v.trafficType === 'EXP' || v.trafficLabel?.toLowerCase().includes('export'))
      .reduce((acc, v) => acc + (v.totalVolumeTons || 0), 0);
    const cbtVolume = monthVessels
      .filter((v) => v.trafficType === 'CBT' || v.trafficLabel?.toLowerCase().includes('cabot'))
      .reduce((acc, v) => acc + (v.totalVolumeTons || 0), 0);

    const concludedTotalVolume = concludedList.reduce((acc, v) => acc + (v.totalVolumeTons || 0), 0);
    const concludedScTotal = concludedList.reduce((acc, v) => acc + (v.scVolumeTons || 0), 0);
    const concludedSqTotal = concludedList.reduce((acc, v) => acc + (v.sqVolumeTons || 0), 0);

    const operatingTotalVolume = operatingList.reduce((acc, v) => acc + (v.totalVolumeTons || 0), 0);
    const plannedTotalVolume = plannedList.reduce((acc, v) => acc + (v.totalVolumeTons || 0), 0);

    summaries.push({
      month: m,
      monthName: monthNames[m - 1],
      shortMonth: shortMonths[m - 1],
      year: 2026,
      vesselCount: monthVessels.length,
      concludedCount: concludedList.length,
      operatingCount: operatingList.length,
      plannedCount: plannedList.length,
      concludedTotalVolume,
      concludedScTotal,
      concludedSqTotal,
      operatingTotalVolume,
      plannedTotalVolume,
      totalVolume,
      scTotal,
      sqTotal,
      salinorVolume,
      sdbVolume,
      expVolume,
      cbtVolume,
    });
  }

  return summaries;
}

export const calculateMonthlySummaries = computeMonthlySummaries;
