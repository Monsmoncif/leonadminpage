import mongoose from "mongoose";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";

/**
 * Checks if there is an overlapping contract for a vehicle within the specified date range.
 * Contracts that count as conflicts:
 * - Same unitId
 * - status in ["Active", "Draft"]
 * - deliveryStatus !== "Returned"
 * - Overlapping dates: existing.startDate <= requestedEndDate AND existing.endDate >= requestedStartDate
 * - If excludeContractId is passed, that contract is excluded (useful when editing a contract)
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

  const conflict = await Contract.findOne(query)
    .populate({ path: "unitId", select: "make model plate" })
    .populate({ path: "clientId", select: "name phone" })
    .lean();

  return conflict;
}

/**
 * Synchronizes the status of one or all vehicles based on active contracts for TODAY.
 * Rule:
 * - If unit status is "Maintenance" or "Out of Service", DO NOT change it (remains Maintenance/Out of Service).
 * - A unit is "Rented" if and only if:
 *   There is a contract with status in ["Active", "Draft"], deliveryStatus !== "Returned",
 *   startDate <= nowEndOfDay AND (deliveryStatus === "Delivered" OR endDate >= nowStartOfDay).
 * - If no such active contract is running TODAY (even if there are future contracts starting tomorrow or next week),
 *   the unit's status is "Available".
 */
export async function syncUnitStatuses(targetUnitId?: string | mongoose.Types.ObjectId) {
  try {
    const now = new Date();
    const nowEndOfDay = new Date(now);
    nowEndOfDay.setHours(23, 59, 59, 999);

    const nowStartOfDay = new Date(now);
    nowStartOfDay.setHours(0, 0, 0, 0);

    // 1. Find all active/draft contracts that are running TODAY or currently delivered
    const activeContractsFilter: any = {
      status: { $in: ["Active", "Draft"] },
      deliveryStatus: { $ne: "Returned" },
      startDate: { $lte: nowEndOfDay },
      $or: [
        { deliveryStatus: "Delivered" },
        { endDate: { $gte: nowStartOfDay } }
      ]
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
