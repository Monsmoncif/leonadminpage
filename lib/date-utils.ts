/**
 * Global Date Formatting Utilities for Leon Car Rental
 * Enforces Day/Month/Year (DD/MM/YYYY) format and UAE (Asia/Dubai, UTC+4) calendar consistency
 * across both browser clients and UTC/remote servers.
 */

export const BUSINESS_TIMEZONE = "Asia/Dubai";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface CalendarYMD {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export interface BusinessDateParts extends CalendarYMD {
  hour: number;   // 0-23
  minute: number; // 0-59
}

/**
 * Extracts year, month, day, hour, minute in UAE time (Asia/Dubai, UTC+4).
 */
export function getBusinessDateParts(dateInput?: Date | string | number): BusinessDateParts {
  const d = dateInput instanceof Date ? dateInput : (dateInput !== undefined && dateInput !== null ? new Date(dateInput) : new Date());
  const safe = isNaN(d.getTime()) ? new Date() : d;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(safe);

    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);
    const hour = parseInt(map.hour, 10) % 24;
    const minute = parseInt(map.minute, 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
      return { year, month, day, hour, minute };
    }
  } catch {
    // Fallback to fixed UTC+4 offset (Asia/Dubai has no DST)
  }

  const dubai = new Date(safe.getTime() + 4 * 3600 * 1000);
  return {
    year: dubai.getUTCFullYear(),
    month: dubai.getUTCMonth() + 1,
    day: dubai.getUTCDate(),
    hour: dubai.getUTCHours(),
    minute: dubai.getUTCMinutes(),
  };
}

/**
 * Returns today's calendar date as "YYYY-MM-DD" in UAE time (Asia/Dubai).
 */
export function getBusinessTodayISO(refDate?: Date): string {
  const { year, month, day } = getBusinessDateParts(refDate);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Returns current time formatted as 12-hour clock in UAE time (e.g. "12:15 AM").
 */
export function getBusinessTimeFormatted(refDate?: Date): string {
  const { hour, minute } = getBusinessDateParts(refDate);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Extracts calendar { year, month, day } safely.
 * Plain calendar strings ("YYYY-MM-DD", "DD/MM/YYYY") keep exact calendar day;
 * Date instances & ISO timestamps with time ("T...") are resolved in Asia/Dubai.
 */
export function extractCalendarYMD(input: any): CalendarYMD | null {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const { year, month, day } = getBusinessDateParts(input);
    return { year, month, day };
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
      return {
        year: parseInt(dmy[3], 10),
        month: parseInt(dmy[2], 10),
        day: parseInt(dmy[1], 10),
      };
    }
    // Plain date string without time component (e.g. "2026-11-20")
    const plainYmd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (plainYmd) {
      return {
        year: parseInt(plainYmd[1], 10),
        month: parseInt(plainYmd[2], 10),
        day: parseInt(plainYmd[3], 10),
      };
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const { year, month, day } = getBusinessDateParts(parsed);
      return { year, month, day };
    }
    // Fallback for "DD/MM/YYYY ..." with trailing text
    const dmyPrefix = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyPrefix) {
      return {
        year: parseInt(dmyPrefix[3], 10),
        month: parseInt(dmyPrefix[2], 10),
        day: parseInt(dmyPrefix[1], 10),
      };
    }
    return null;
  }
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) return null;
  const { year, month, day } = getBusinessDateParts(parsed);
  return { year, month, day };
}

/**
 * Formats any date input as "YYYY-MM-DD" for HTML date inputs in Asia/Dubai calendar time.
 */
export function formatDateToInput(dateInput?: any, fallbackDate?: string): string {
  const ymd = extractCalendarYMD(dateInput);
  if (!ymd) return fallbackDate ?? getBusinessTodayISO();
  return `${ymd.year}-${String(ymd.month).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;
}

/**
 * Adds (or subtracts) whole calendar days cleanly without UTC/local timezone drift.
 */
export function addDaysToISODate(dateInput: any, deltaDays: number): string {
  const ymd = extractCalendarYMD(dateInput) || extractCalendarYMD(getBusinessTodayISO())!;
  const utc = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + Math.trunc(deltaDays)));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Converts a contract date input into a canonical UTC midnight Date for that calendar day.
 */
export function parseContractDateToUTCMidnight(dateInput: any): Date | null {
  const ymd = extractCalendarYMD(dateInput);
  if (!ymd) return null;
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 0, 0, 0, 0));
}

/**
 * Converts a contract date input into UTC end-of-day (23:59:59.999Z) for that calendar day.
 */
export function parseContractDateToUTCEndOfDay(dateInput: any): Date | null {
  const ymd = extractCalendarYMD(dateInput);
  if (!ymd) return null;
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 23, 59, 59, 999));
}

/**
 * Returns today's start-of-day Date in UTC aligned with UAE (Asia/Dubai) calendar date.
 */
export function getBusinessStartOfDayUTC(refDate?: Date): Date {
  return parseContractDateToUTCMidnight(getBusinessTodayISO(refDate))!;
}

/**
 * Returns today's end-of-day Date in UTC aligned with UAE (Asia/Dubai) calendar date.
 */
export function getBusinessEndOfDayUTC(refDate?: Date): Date {
  return parseContractDateToUTCEndOfDay(getBusinessTodayISO(refDate))!;
}

/**
 * Returns first day of current UAE (Asia/Dubai) month at 00:00:00.000Z.
 */
export function getBusinessStartOfMonthUTC(refDate?: Date): Date {
  const { year, month } = getBusinessDateParts(refDate);
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

/**
 * Returns date formatted as "DD/MM/YYYY" (e.g. "20/10/2026")
 * Immune to client browser locale and server timezone.
 */
export function formatDateDMY(dateInput: any): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[3].padStart(2, "0")}/${isoMatch[2].padStart(2, "0")}/${isoMatch[1]}`;
    }
  }
  const ymd = extractCalendarYMD(dateInput);
  if (!ymd) return String(dateInput);
  return `${String(ymd.day).padStart(2, "0")}/${String(ymd.month).padStart(2, "0")}/${ymd.year}`;
}

/**
 * Returns date formatted as "DD MMM YYYY" (e.g. "20 Oct 2026")
 * Day always comes before month, resolved consistently in UAE calendar time.
 */
export function formatDateWords(dateInput: any): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const day = parseInt(isoMatch[3], 10);
      const monthIdx = parseInt(isoMatch[2], 10) - 1;
      const year = isoMatch[1];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTHS_SHORT[monthIdx]} ${year}`;
      }
    }
  }
  const ymd = extractCalendarYMD(dateInput);
  if (!ymd) return String(dateInput);
  return `${ymd.day} ${MONTHS_SHORT[ymd.month - 1]} ${ymd.year}`;
}

/**
 * Returns date formatted as "DD MMM" (e.g. "20 Oct")
 */
export function formatDateShort(dateInput: any): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const day = parseInt(isoMatch[3], 10);
      const monthIdx = parseInt(isoMatch[2], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTHS_SHORT[monthIdx]}`;
      }
    }
  }
  const ymd = extractCalendarYMD(dateInput);
  if (!ymd) return String(dateInput);
  return `${ymd.day} ${MONTHS_SHORT[ymd.month - 1]}`;
}

/**
 * Returns date & time formatted as "DD/MM/YYYY HH:MM" in UAE (Asia/Dubai) time
 */
export function formatDateTimeDMY(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const { year, month, day, hour, minute } = getBusinessDateParts(d);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Parses a time string such as "10:00 AM", "02:53 PM", "12:15 AM", "00:15 AM", "14:30" into minutes since midnight.
 * Returns null when the value is empty or not a real time (e.g. "Pending Handover").
 */
export function parseTimeToMinutes(input: any): number | null {
  if (input === undefined || input === null) return null;
  const str = String(input).trim();
  if (!str) return null;
  const m = str.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])?\.?[Mm]?\.?$/);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3] ? m[3].toUpperCase() : null;
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours > 12) return null;
    if (meridiem === "A") hours = hours === 12 || hours === 0 ? 0 : hours;
    else hours = hours === 12 ? 12 : hours + 12;
  } else if (hours > 23) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Calculates the rental duration in billable full 24-hour days.
 *
 * Rule: only every full 24 hours between pick-up and return counts as 1 day; any extra
 * partial hours (< 24h) beyond full 24h blocks are NOT rounded up to an extra day
 * (the admin counts/bills extra hours manually).
 *   03/11 10:00 AM -> 04/11 10:00 AM = 24h  = 1 day
 *   03/11 10:00 AM -> 04/11 01:00 PM = 27h  = 1 day (+ 3 hours)
 *   01/11 10:00 AM -> 06/11 10:00 AM = 120h = 5 days
 *   01/11 10:00 AM -> 06/11 02:00 PM = 124h = 5 days (+ 4 hours)
 * When no times are provided (or the return time is empty) the return time defaults to the
 * pick-up time, so the result is simply the number of calendar days between the dates.
 * Minimum duration is always 1 day.
 */
export function calculateRentalDuration(
  startDateInput: any,
  endDateInput: any,
  startTimeInput?: any,
  endTimeInput?: any
): { days: number; hours: number; minutes: number; billableDays: number } {
  const fallback = { days: 1, hours: 0, minutes: 0, billableDays: 1 };
  if (!startDateInput || !endDateInput) return fallback;

  const sYmd = extractCalendarYMD(startDateInput);
  const eYmd = extractCalendarYMD(endDateInput);

  if (!sYmd || !eYmd) return fallback;

  // Whole calendar days between the two dates (UTC math avoids any TZ/DST shift)
  const dayDiff = Math.round(
    (Date.UTC(eYmd.year, eYmd.month - 1, eYmd.day) -
      Date.UTC(sYmd.year, sYmd.month - 1, sYmd.day)) / 86400000
  );
  if (dayDiff <= 0) {
    // Same-day rental: show the real hours when both times are valid, billed as 1 day
    const sm = parseTimeToMinutes(startTimeInput);
    const em = sm === null ? null : parseTimeToMinutes(endTimeInput);
    const sameDayMinutes = sm !== null && em !== null && em > sm ? em - sm : 0;
    return {
      days: 0,
      hours: Math.floor(sameDayMinutes / 60),
      minutes: sameDayMinutes % 60,
      billableDays: 1,
    };
  }

  const startMin = parseTimeToMinutes(startTimeInput);
  // Without a valid pick-up time, ignore the return time as well (whole days only)
  const endMin = startMin === null ? null : parseTimeToMinutes(endTimeInput);

  const startOffset = startMin ?? 0;
  const endOffset = endMin ?? startOffset;

  const totalMinutes = dayDiff * 1440 + (endOffset - startOffset);
  if (totalMinutes <= 0) return fallback;

  const fullDays = Math.floor(totalMinutes / 1440);
  return {
    days: fullDays,
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    billableDays: Math.max(1, fullDays),
  };
}

export function calculateRentalDays(
  startDateInput: any,
  endDateInput: any,
  startTimeInput?: any,
  endTimeInput?: any
): number {
  return calculateRentalDuration(startDateInput, endDateInput, startTimeInput, endTimeInput).billableDays;
}

/**
 * Computes the endDate ("YYYY-MM-DD") that matches a requested number of billable full 24h days
 * from startDate, taking into account checkoutTime and checkinTime.
 */
export function computeEndDateForRentalDays(
  startDateInput: any,
  targetDays: number,
  startTimeInput?: any,
  endTimeInput?: any
): string {
  const safeDays = Math.max(1, Math.trunc(Number(targetDays) || 1));
  const startISO = formatDateToInput(startDateInput);
  const startMin = parseTimeToMinutes(startTimeInput);
  const endMin = startMin === null ? null : parseTimeToMinutes(endTimeInput);
  // When return time is earlier than pickup time, e.g. 2:00 PM -> 10:00 AM, reaching 2+ full
  // 24h blocks requires one additional calendar date; extra partial hours (endMin >= startMin) do not add a day.
  const shortReturnNeedsExtraCalendarDay =
    startMin !== null && endMin !== null && endMin < startMin && safeDays > 1;
  const calendarOffset = shortReturnNeedsExtraCalendarDay ? safeDays + 1 : safeDays;
  return addDaysToISODate(startISO, calendarOffset);
}

/**
 * Human readable duration, e.g. "1 day - 3 hours (يوم و 3 ساعات)".
 * Extra hours beyond full 24h days are shown separately and do NOT add an extra billable day.
 */
export function formatRentalDuration(
  startDateInput: any,
  endDateInput: any,
  startTimeInput?: any,
  endTimeInput?: any
): string {
  const { days, hours, minutes } = calculateRentalDuration(startDateInput, endDateInput, startTimeInput, endTimeInput);
  const parts: string[] = [];
  const partsAr: string[] = [];
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
    partsAr.push(days === 1 ? "يوم" : days === 2 ? "يومان" : `${days} أيام`);
  }
  if (hours > 0 || minutes > 0) {
    if (hours > 0 && minutes > 0) {
      parts.push(`${hours} ${hours === 1 ? "hour" : "hours"} ${minutes}m`);
      partsAr.push(`${hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : `${hours} ساعات`} و ${minutes} د`);
    } else if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
      partsAr.push(hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : `${hours} ساعات`);
    } else {
      parts.push(`${minutes} min`);
      partsAr.push(`${minutes} دقيقة`);
    }
  }
  if (parts.length === 0) {
    return "1 day (يوم)";
  }
  return `${parts.join(" - ")} (${partsAr.join(" و ")})`;
}

