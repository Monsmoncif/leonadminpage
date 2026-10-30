/**
 * Global Date Formatting Utilities for Leon Car Rental
 * Enforces Day/Month/Year (DD/MM/YYYY) format everywhere across the application.
 */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Returns date formatted as "DD/MM/YYYY" (e.g. "20/10/2026")
 * Immune to client browser locale and OS regional settings.
 */
export function formatDateDMY(dateInput: any): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    // Already DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    // Match YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, "0");
      const day = isoMatch[3].padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Returns date formatted as "DD MMM YYYY" (e.g. "20 Oct 2026")
 * Day always comes before month.
 */
export function formatDateWords(dateInput: any): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const day = parseInt(isoMatch[3], 10);
      const monthIdx = parseInt(isoMatch[2], 10) - 1;
      const year = isoMatch[1];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTHS_SHORT[monthIdx]} ${year}`;
      }
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Returns date formatted as "DD MMM" (e.g. "20 Oct")
 */
export function formatDateShort(dateInput: any): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const day = parseInt(isoMatch[3], 10);
      const monthIdx = parseInt(isoMatch[2], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTHS_SHORT[monthIdx]}`;
      }
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/**
 * Returns date & time formatted as "DD/MM/YYYY HH:MM" (e.g. "20/10/2026 14:30")
 */
export function formatDateTimeDMY(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Normalizes any date input (ISO string, DD/MM/YYYY, Date instance) to midnight (00:00:00.000)
 */
function parseDateToMidnight(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const d = new Date(input.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    // Match DD/MM/YYYY
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10), 0, 0, 0, 0);
    }
    // Match YYYY-MM-DD or YYYY/MM/DD
    const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10), 0, 0, 0, 0);
    }
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

/**
 * Calculates rental duration in days inclusively.
 * In car rentals, both the start day and the expected return day are billable rental days.
 * E.g. Start 01/11/2026 to Return 06/11/2026 = 6 days (1st, 2nd, 3rd, 4th, 5th, 6th).
 * E.g. Same-day rental 01/11/2026 to 01/11/2026 = 1 day.
 */
export function calculateRentalDays(startDateInput: any, endDateInput: any): number {
  if (!startDateInput || !endDateInput) return 1;

  const s = parseDateToMidnight(startDateInput);
  const e = parseDateToMidnight(endDateInput);

  if (!s || !e) return 1;
  if (e.getTime() < s.getTime()) return 1;

  const diffDays = Math.round((e.getTime() - s.getTime()) / 86400000);
  // Inclusive counting (+1 day)
  return Math.max(1, diffDays + 1);
}

