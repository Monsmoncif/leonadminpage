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

  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return Math.min(23 * 60 + 59, Math.max(0, hours * 60 + minutes));
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

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

  const toDayTimestamp = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const dayStartA = toDayTimestamp(sA);
  const dayEndA = toDayTimestamp(eA);
  const dayStartB = toDayTimestamp(sB);
  const dayEndB = toDayTimestamp(eB);

  const hasTimes = Boolean(times && (times.timeStartA || times.timeEndA || times.timeStartB || times.timeEndB));

  if (dayEndA === dayStartB) {
    if (hasTimes) {
      const minutesEndA = timeStringToMinutes(times?.timeEndA || times?.timeStartA, 10 * 60);
      const minutesStartB = timeStringToMinutes(times?.timeStartB, 10 * 60);
      return minutesStartB < minutesEndA;
    }
    return false;
  }

  if (dayStartA === dayEndB) {
    if (hasTimes) {
      const minutesStartA = timeStringToMinutes(times?.timeStartA, 10 * 60);
      const minutesEndB = timeStringToMinutes(times?.timeEndB || times?.timeStartB, 10 * 60);
      return minutesStartA < minutesEndB;
    }
    return false;
  }

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

  if (dayStartA === dayStartB) return true;
  if (dayEndA === dayEndB) return true;

  return dayStartA < dayEndB && dayEndA > dayStartB;
}

