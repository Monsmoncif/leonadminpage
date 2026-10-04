import mongoose from "mongoose";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";
import { areDatesOverlapping } from "./date-overlap";

export { areDatesOverlapping };

/**
 * Checks if there is an overlapping contract for a vehicle within the specified date range.
 * Rules:
 * - Same unitId
 * - status in ["Active", "Draft"]
 * - deliveryStatus !== "Returned"
 * - A new contract CAN start on the finish day of an existing contract (turnover day).
 * - If excludeContractId is passed, that contract is excluded (useful when editing a contract).
 */
export async function checkContractDateOverlap({
  unitId,
  startDate,
  endDate,
  excludeContractId,
}: {
  unitId: string | mongoose.Types.ObjectId;
  startDate: string | Date;
  endDate: string | Date;
  excludeContractId?: string | mongoose.Types.ObjectId;
}) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid start or end date.");
  }

  if (start > end) {
    throw new Error("Start date must be before or equal to expected end date.");
  }

  const query: any = {
    unitId: new mongoose.Types.ObjectId(unitId.toString()),
    status: { $in: ["Active", "Draft"] },
    deliveryStatus: { $ne: "Returned" },
    startDate: { $lte: end },
    endDate: { $gte: start },
  };

  if (excludeContractId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeContractId.toString()) };
  }

  const candidateContracts = await Contract.find(query)
    .populate({ path: "unitId", select: "make model plate" })
    .populate({ path: "clientId", select: "name phone" })
    .lean();

  for (const candidate of candidateContracts) {
    if (areDatesOverlapping(candidate.startDate, candidate.endDate, startDate, endDate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Synchronizes the status of one or all vehicles based on active contracts for TODAY.
 * Rule:
 * - If unit status is "Maintenance" or "Out of Service", DO NOT change it (remains Maintenance/Out of Service).
 * - A unit is "Rented" IF AND ONLY IF:
 *   There is an active contract where the vehicle has ACTUALLY been handed over to the client:
 *   1) deliveryStatus === "Delivered" (the driver or admin confirmed vehicle handover)
 *   2) deliveryStatus !== "Returned" (vehicle has not been returned back)
 *   3) status not in ["Completed", "Cancelled"]
 *   4) startDate <= nowEndOfDay (start date has arrived)
 *   5) endDate > nowEndOfDay (the contract has NOT reached its finish day yet)
 * - CRITICAL: On the finish day of a contract (endDate <= nowEndOfDay) or when it finishes,
 *   the car is available for pickup / hand over / new contract.
 * - If a contract has deliveryStatus === "Pending", car is NOT yet with the client -> "Available".
 */
export async function syncUnitStatuses(targetUnitId?: string | mongoose.Types.ObjectId) {
  try {
    const now = new Date();
    const nowEndOfDay = new Date(now);
    nowEndOfDay.setHours(23, 59, 59, 999);

    // 1. Find contracts where the vehicle is CURRENTLY HANDED OVER and has not yet reached its finish day
    const activeContractsFilter: any = {
      status: { $nin: ["Completed", "Cancelled"] },
      deliveryStatus: "Delivered",
      startDate: { $lte: nowEndOfDay },
      endDate: { $gt: nowEndOfDay },
    };

    if (targetUnitId) {
      activeContractsFilter.unitId = new mongoose.Types.ObjectId(targetUnitId.toString());
    }

    const ongoingContracts = await Contract.find(activeContractsFilter).select("unitId").lean();
    const rentedUnitIdSet = new Set(ongoingContracts.map((c: any) => c.unitId.toString()));

    // 2. Fetch units to sync (skip Maintenance or Out of Service)
    const unitFilter: any = {
      status: { $nin: ["Maintenance", "Out of Service"] }
    };
    if (targetUnitId) {
      unitFilter._id = new mongoose.Types.ObjectId(targetUnitId.toString());
    }

    const unitsToSync = await Unit.find(unitFilter).select("_id status").lean();

    const bulkOps: any[] = [];
    for (const u of unitsToSync) {
      const isCurrentlyRented = rentedUnitIdSet.has(u._id.toString());
      const expectedStatus = isCurrentlyRented ? "Rented" : "Available";

      if (u.status !== expectedStatus) {
        bulkOps.push({
          updateOne: {
            filter: { _id: u._id },
            update: { $set: { status: expectedStatus } }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await Unit.bulkWrite(bulkOps);
    }
  } catch (err) {
    console.error("Error in syncUnitStatuses:", err);
  }
}
