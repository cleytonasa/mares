import { TideAnnotation } from '../types/maritime';

/**
 * Format a Date or date string to local "HH:MM" strictly without timezone shifting.
 */
export function formatBargeTime(dateOrStr: Date | string): string {
  if (typeof dateOrStr === 'string') {
    // If it contains "T"
    if (dateOrStr.includes('T')) {
      const timePart = dateOrStr.split('T')[1];
      if (timePart) {
        const [hh, mm] = timePart.split(':');
        if (hh !== undefined && mm !== undefined) {
          return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
        }
      }
    }
    const d = new Date(dateOrStr);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '00:00';
  }

  const hours = String(dateOrStr.getHours()).padStart(2, '0');
  const minutes = String(dateOrStr.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format a Date or date string to "YYYY-MM-DD" strictly without timezone shifting.
 */
export function formatBargeDate(dateOrStr: Date | string): string {
  if (typeof dateOrStr === 'string') {
    if (dateOrStr.includes('T')) {
      return dateOrStr.split('T')[0];
    }
    const d = new Date(dateOrStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return '';
  }

  const y = dateOrStr.getFullYear();
  const m = String(dateOrStr.getMonth() + 1).padStart(2, '0');
  const day = String(dateOrStr.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse date and time into a robust Date object in the local coordinate space.
 * Accepts "YYYY-MM-DD" and "HH:MM" or ISO-like string.
 */
export function parseBargeDateTime(dateTimeStr: string): Date {
  if (!dateTimeStr) return new Date();

  if (dateTimeStr.includes('T')) {
    const [datePart, timePart] = dateTimeStr.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = (timePart || '00:00').split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  }

  const d = new Date(dateTimeStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Create a standardized ISO-like string (YYYY-MM-DDTHH:mm:00) without 'Z' to avoid UTC drifting.
 */
export function createBargeDateTimeString(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map((v) => v.padStart(2, '0'));
  const [hh, mm] = timeStr.split(':').map((v) => v.padStart(2, '0'));
  return `${y}-${m}-${d}T${hh}:${mm}:00`;
}
