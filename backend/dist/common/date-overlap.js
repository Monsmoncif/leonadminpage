"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areDatesOverlapping = areDatesOverlapping;
function areDatesOverlapping(startA, endA, startB, endB) {
    if (!startA || !endA || !startB || !endB)
        return false;
    const sA = new Date(startA);
    const eA = new Date(endA);
    const sB = new Date(startB);
    const eB = new Date(endB);
    if (isNaN(sA.getTime()) || isNaN(eA.getTime()) || isNaN(sB.getTime()) || isNaN(eB.getTime())) {
        return false;
    }
    const toDayTimestamp = (d) => {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };
    const dayStartA = toDayTimestamp(sA);
    const dayEndA = toDayTimestamp(eA);
    const dayStartB = toDayTimestamp(sB);
    const dayEndB = toDayTimestamp(eB);
    if (dayStartA === dayStartB)
        return true;
    if (dayEndA === dayEndB)
        return true;
    if (dayEndA === dayStartB)
        return false;
    if (dayStartA === dayEndB)
        return false;
    return dayStartA < dayEndB && dayEndA > dayStartB;
}
//# sourceMappingURL=date-overlap.js.map