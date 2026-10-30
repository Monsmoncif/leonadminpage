/**
 * Utility function to parse a time string or Date into minutes from midnight (0 to 1439).
 * Supports "10:00 AM", "02:30 PM", "14:30", "2:00pm", Date objects, ISO strings.
 */
export function timeStringToMinutes(timeInput?: string | Date | null, defaultMinutes: number = 10 * 60): number {
  if (!timeInput) return defaultMinutes;

  if (timeInput instanceof Date) {
    if (isNaN(timeInput.getTime())) return defaultMinutes;
    return timeInput.getHours() * 60 + timeInput.getMinutes();
  }

  if (typeof timeInput !== "string") return defaultMinutes;

  const trimmed = timeInput.trim();
  if (!trimmed || trimmed === "Pending Return" || trimmed === "Pending Handover") {
    return defaultMinutes;
  }

  // 12-hour format: "02:30 PM", "2:30pm", "10:00 AM", "12:00 PM", "12:00 AM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return Math.min(23 * 60 + 59, Math.max(0, hours * 60 + minutes));
  }

  // 24-hour format: "14:30", "09:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  // Try Date parse if it looks like an ISO string
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
  }

  return defaultMinutes;
}

export interface OverlapTimeOptions {
  timeStartA?: string | Date | null;
  timeEndA?: string | Date | null;
  timeStartB?: string | Date | null;
  timeEndB?: string | Date | null;
}

/**
 * Utility function to check if two rental/booking contract date intervals overlap.
 * 
 * Rules:
 * 1. Turnover rule: If existing contract A finishes on Day X, and new contract B starts on Day X:
 *    - If times are provided, B can start at or after A's return time without conflict.
 *    - If B starts before A's return time, it is flagged as a conflict.
 *    - If no times are provided, turnover day is allowed.
 * 2. Same Day bookings: If both contracts start and end on the exact same day:
 *    - If times are provided, allowed if one finishes before the other starts.
 * 3. Strict calendar interval overlap: If ranges overlap across days -> Conflict.
 */
export function areDatesOverlapping(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string,
  times?: OverlapTimeOptions
): boolean {
  if (!startA || !endA || !startB || !endB) return false;

  const sA = new Date(startA);
  const eA = new Date(endA);
  const sB = new Date(startB);
  const eB = new Date(endB);

  if (isNaN(sA.getTime()) || isNaN(eA.getTime()) || isNaN(sB.getTime()) || isNaN(eB.getTime())) {
    return false;
  }

  // Normalize to local midnight timestamps to compare calendar dates cleanly
  const toDayTimestamp = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const dayStartA = toDayTimestamp(sA);
  const dayEndA = toDayTimestamp(eA);
  const dayStartB = toDayTimestamp(sB);
  const dayEndB = toDayTimestamp(eB);

  const hasTimes = Boolean(times && (times.timeStartA || times.timeEndA || times.timeStartB || times.timeEndB));

  // 1. Turnover rule: Contract B starts on the day Contract A finishes
  // Example: Contract A ends 4 Nov, Contract B starts 4 Nov
  if (dayEndA === dayStartB) {
    if (hasTimes) {
      const minutesEndA = timeStringToMinutes(times?.timeEndA || times?.timeStartA, 10 * 60);
      const minutesStartB = timeStringToMinutes(times?.timeStartB, 10 * 60);
      return minutesStartB < minutesEndA;
    }
    return false;
  }

  // 2. Turnover rule: Contract A starts on the day Contract B finishes
  // Example: Contract B ends 4 Nov, Contract A starts 4 Nov
  if (dayStartA === dayEndB) {
    if (hasTimes) {
      const minutesStartA = timeStringToMinutes(times?.timeStartA, 10 * 60);
      const minutesEndB = timeStringToMinutes(times?.timeEndB || times?.timeStartB, 10 * 60);
      return minutesStartA < minutesEndB;
    }
    return false;
  }

  // 3. Same Day bookings: both contracts start and end on the exact same day
  if (dayStartA === dayStartB && dayEndA === dayEndB && dayStartA === dayEndA) {
    if (hasTimes) {
      const minStartA = timeStringToMinutes(times?.timeStartA, 10 * 60);
      const minEndA = timeStringToMinutes(times?.timeEndA || times?.timeStartA, 10 * 60);
      const minStartB = timeStringToMinutes(times?.timeStartB, 10 * 60);
      const minEndB = timeStringToMinutes(times?.timeEndB || times?.timeStartB, 10 * 60);
      if (minEndA <= minStartB || minEndB <= minStartA) {
        return false;
      }
    }
    return true;
  }

  // 4. If both contracts start on the exact same calendar day -> Conflict
  if (dayStartA === dayStartB) return true;

  // 5. If both contracts end on the exact same calendar day -> Conflict
  if (dayEndA === dayEndB) return true;

  // 6. Strict interval overlap between calendar dates:
  return dayStartA < dayEndB && dayEndA > dayStartB;
}
