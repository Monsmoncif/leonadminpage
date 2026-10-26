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
