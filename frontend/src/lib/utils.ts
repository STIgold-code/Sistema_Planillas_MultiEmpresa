import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string (ISO) as dd/MM/yyyy without timezone conversion.
 * Avoids the issue where PostgreSQL DATE fields (midnight UTC) get shifted
 * to the previous day in UTC-5 timezones.
 */
export function formatDateSafe(date: string | null | undefined): string {
  if (!date) return '-';
  const [y, m, d] = date.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Formats a full ISO timestamp as dd/MM/yyyy HH:mm in Peru time. Use for
 * created_at / updated_at columns where the time matters.
 */
export function formatDateTimeSafe(date: string | null | undefined): string {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  });
}

/**
 * Parses an ISO date string into a local Date object without timezone shift.
 * Use when you need date-fns format with locale (e.g. month names).
 */
export function parseDateLocal(date: string): Date {
  const [y, m, d] = date.split('T')[0].split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

/**
 * Formats a date string with Intl options (e.g. short month) without timezone shift.
 * Creates a local Date at noon to avoid day-boundary issues.
 */
export function formatDateSafeLocale(
  date: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '-';
  const [y, m, d] = date.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toLocaleDateString('es-PE', options);
}

/**
 * Converts a Date object to YYYY-MM-DD string without timezone shift.
 * Safe replacement for date.toISOString().split('T')[0] which can produce
 * the wrong date in UTC-5 timezones (e.g. Peru).
 *
 * @example
 * toDateString(new Date(2025, 0, 8)) → '2025-01-08'
 * toDateString(new Date()) → today's date as YYYY-MM-DD in local timezone
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
