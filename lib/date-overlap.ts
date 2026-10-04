/**
 * Utility function to check if two rental/booking contract date intervals overlap.
 * 
 * Rules:
 * 1. A new contract CAN start on the day an existing contract finishes:
 *    If existing.endDate is Day X and requested.startDate is Day X -> ALLOWED (no overlap).
 * 2. A contract CAN finish on the day an existing contract starts:
 *    If requested.endDate is Day X and existing.startDate is Day X -> ALLOWED (no overlap).
 * 3. If both contracts start on the exact same calendar day -> CONFLICT.
 * 4. If both contracts end on the exact same calendar day -> CONFLICT.
 * 5. If their date ranges overlap (startA < endB && endA > startB) -> CONFLICT.
 */
export function areDatesOverlapping(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string
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

  // If both contracts start on the exact same calendar day -> Conflict
  if (dayStartA === dayStartB) return true;

  // If both contracts end on the exact same calendar day -> Conflict
  if (dayEndA === dayEndB) return true;

  // If contract B starts on the day contract A finishes -> ALLOWED (no conflict)
  if (dayEndA === dayStartB) return false;

  // If contract A starts on the day contract B finishes -> ALLOWED (no conflict)
  if (dayStartA === dayEndB) return false;

  // Strict interval overlap between calendar dates:
  return dayStartA < dayEndB && dayEndA > dayStartB;
}
