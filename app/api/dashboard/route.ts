export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Client } from "@/models/Client";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import { Driver } from "@/models/Driver";
import { syncUnitStatuses } from "@/lib/unit-status";

const emptyResponse = {
  stats: {
    totalRevenue: "AED 0",
    activeRentals: "0",
    totalCustomers: "0",
    totalDrivers: "0",
    totalVehicles: "0",
    availableVehicles: "0",
    rentedVehicles: "0",
    vehiclesInMaintenance: "0",
    completedRentals: "0",
    overdueRentals: "0",
    totalRentals: "0",
    damagesReported: "0",
    depositsPending: "AED 0",
  },
  rentalsPerMonthData: [],
  revenueData: [],
  vehicleAvailabilityData: [
    { name: "Available", value: 0, color: "#22C55E" },
    { name: "Rented", value: 0, color: "#3B82F6" },
    { name: "Reserved", value: 0, color: "#F59E0B" },
    { name: "Maintenance", value: 0, color: "#E53935" },
  ],
  mostRentedCarsData: [],
  recentActivity: [],
  upcomingReturns: [],
};

export async function GET(request: Request) {
  try {
    await connectDB();
    void User;
    await syncUnitStatuses();

    // Date calculations for changes (This month vs Last month)
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const selectedYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfSelectedYear = new Date(selectedYear, 0, 1);
    const endOfSelectedYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const netRevenueExpr = {
      $sum: {
        $max: [
          0,
          { $subtract: [{ $ifNull: ["$totalAmount", 0] }, { $ifNull: ["$damageCharge", 0] }] },
        ],
      },
    };

    // Execute just 6 parallel queries instead of 26 to stay fast and avoid connection-pool pressure
    const [unitFacetRes, clientFacetRes, totalDrivers, contractFacetRes, recentActivity, upcomingReturnsRaw] =
      await Promise.all([
        Unit.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
              thisMonth: [{ $match: { createdAt: { $gte: startOfThisMonth } } }, { $count: "count" }],
              lastMonth: [
                { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
                { $count: "count" },
              ],
            },
          },
        ]),
        Client.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              thisMonth: [{ $match: { createdAt: { $gte: startOfThisMonth } } }, { $count: "count" }],
              lastMonth: [
                { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
                { $count: "count" },
              ],
            },
          },
        ]),
        Driver.countDocuments(),
        Contract.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
              overdue: [
                { $match: { status: "Active", endDate: { $lt: now } } },
                { $count: "count" },
              ],
              thisMonthCount: [{ $match: { createdAt: { $gte: startOfThisMonth } } }, { $count: "count" }],
              lastMonthCount: [
                { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
                { $count: "count" },
              ],
              revenueThisMonth: [
                {
                  $match: {
                    contractType: { $ne: "Personalized" },
                    personalizedPersonName: { $in: [null, ""] },
                    $or: [
                      { status: "Completed", updatedAt: { $gte: startOfThisMonth } },
                      { status: "Active", startDate: { $gte: startOfThisMonth } },
                    ],
                  },
                },
                { $group: { _id: null, total: netRevenueExpr } },
              ],
              revenueLastMonth: [
                {
                  $match: {
                    contractType: { $ne: "Personalized" },
                    personalizedPersonName: { $in: [null, ""] },
                    $or: [
                      { status: "Completed", updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                      { status: "Active", startDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                    ],
                  },
                },
                { $group: { _id: null, total: netRevenueExpr } },
              ],
              totalRevenue: [
                {
                  $match: {
                    contractType: { $ne: "Personalized" },
                    personalizedPersonName: { $in: [null, ""] },
                    status: { $in: ["Active", "Completed"] },
                  },
                },
                { $group: { _id: null, total: netRevenueExpr } },
              ],
              contractsPerMonth: [
                { $match: { createdAt: { $gte: startOfSelectedYear, $lte: endOfSelectedYear } } },
                { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
              revenuePerMonth: [
                {
                  $match: {
                    contractType: { $ne: "Personalized" },
                    personalizedPersonName: { $in: [null, ""] },
                    status: { $in: ["Active", "Completed"] },
                  },
                },
                { $group: { _id: { $month: "$createdAt" }, revenue: netRevenueExpr } },
                { $sort: { _id: 1 } },
              ],
              mostRented: [
                { $group: { _id: "$unitId", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 4 },
                {
                  $lookup: {
                    from: "units",
                    localField: "_id",
                    foreignField: "_id",
                    as: "unit",
                  },
                },
                { $unwind: { path: "$unit", preserveNullAndEmptyArrays: true } },
              ],
            },
          },
        ]),
        Contract.find()
          .sort({ createdAt: -1 })
          .limit(4)
          .select("contractNumber status totalAmount createdAt customer personalizedPersonName clientId unitId")
          .populate({ path: "clientId", select: "name", strictPopulate: false })
          .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
          .lean(),
        Contract.find({ status: "Active" })
          .sort({ endDate: 1 })
          .limit(4)
          .select("contractNumber endDate clientId unitId")
          .populate({ path: "clientId", select: "name", strictPopulate: false })
          .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
          .lean(),
      ]);

    const uFacet = unitFacetRes[0] || {};
    const cFacet = clientFacetRes[0] || {};
    const kFacet = contractFacetRes[0] || {};

    const unitStatusMap = new Map<string, number>(
      (uFacet.byStatus || []).map((s: any) => [s._id, s.count || 0])
    );
    const contractStatusMap = new Map<string, number>(
      (kFacet.byStatus || []).map((s: any) => [s._id, s.count || 0])
    );

    const totalUnits = uFacet.total?.[0]?.count || 0;
    const availableUnits = unitStatusMap.get("Available") || 0;
    const rentedUnits = unitStatusMap.get("Rented") || 0;
    const maintenanceUnits = unitStatusMap.get("Maintenance") || 0;
    const unitsThisMonth = uFacet.thisMonth?.[0]?.count || 0;
    const unitsLastMonth = uFacet.lastMonth?.[0]?.count || 0;

    const totalClients = cFacet.total?.[0]?.count || 0;
    const clientsThisMonth = cFacet.thisMonth?.[0]?.count || 0;
    const clientsLastMonth = cFacet.lastMonth?.[0]?.count || 0;

    const totalContracts = kFacet.total?.[0]?.count || 0;
    const activeContracts = contractStatusMap.get("Active") || 0;
    const completedContracts = contractStatusMap.get("Completed") || 0;
    const overdueContracts = kFacet.overdue?.[0]?.count || 0;
    const contractsThisMonth = kFacet.thisMonthCount?.[0]?.count || 0;
    const contractsLastMonth = kFacet.lastMonthCount?.[0]?.count || 0;

    const revenueThisMonthResult = kFacet.revenueThisMonth || [];
    const revenueLastMonthResult = kFacet.revenueLastMonth || [];
    const totalRevenueResult = kFacet.totalRevenue || [];
    const contractsPerMonth = kFacet.contractsPerMonth || [];
    const revenuePerMonth = kFacet.revenuePerMonth || [];
    const mostRented = kFacet.mostRented || [];

    const revenueThisMonth = revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0;
    const revenueLastMonth = revenueLastMonthResult.length > 0 ? revenueLastMonthResult[0].total : 0;
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    // Helper for percentage change
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const changes = {
      revenue: calcChange(revenueThisMonth, revenueLastMonth),
      rentals: calcChange(contractsThisMonth, contractsLastMonth),
      customers: calcChange(clientsThisMonth, clientsLastMonth),
      vehicles: calcChange(unitsThisMonth, unitsLastMonth),
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rentalsPerMonthData = monthNames.map((month, idx) => {
      const found = contractsPerMonth.find((c: any) => c._id === idx + 1);
      return { month, rentals: found ? found.count : 0 };
    });

    const revenueData = monthNames.map((month, idx) => {
      const found = revenuePerMonth.find((r: any) => r._id === idx + 1);
      return { month, revenue: found ? found.revenue : 0 };
    });

    const mostRentedCarsData = mostRented.map((item: any) => ({
      name: item.unit ? `${item.unit.make} ${item.unit.model}` : "Unknown Vehicle",
      value: item.count,
    }));

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingReturns = upcomingReturnsRaw.map((contract: any, idx: number) => {
      const endDate = new Date(contract.endDate);
      const isToday = endDate >= today && endDate < tomorrow;
      const isTomorrow = endDate >= tomorrow && endDate < new Date(tomorrow.getTime() + 86400000);

      return {
        id: idx + 1,
        customer: contract.clientId?.name || "Unknown",
        vehicle: contract.unitId
          ? `${contract.unitId.make} ${contract.unitId.model} (${contract.unitId.plate})`
          : "Unknown",
        dueDate: isToday ? "Today" : isTomorrow ? "Tomorrow" : endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        dueTime: endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        status: isToday ? "due-today" : "upcoming",
      };
    });

    // Format activity from recent contracts
    const formattedActivity = recentActivity.map((contract: any, idx: number) => {
      const clientName = contract.clientId?.name || "Unknown";
      const unitInfo = contract.unitId
        ? `${contract.unitId.make} ${contract.unitId.model}`
        : "";
      
      let text = "";
      let type = "booking";

      switch (contract.status) {
        case "Active":
          text = `New contract created for ${clientName}${unitInfo ? ` — ${unitInfo}` : ""}`;
          type = "booking";
          break;
        case "Completed":
          text = `Vehicle returned by ${clientName}${unitInfo ? ` — ${unitInfo}` : ""}`;
          type = "maintenance";
          break;
        case "Cancelled":
          text = `Contract cancelled for ${clientName}`;
          type = "payment";
          break;
        default:
          text = `Contract updated for ${clientName}`;
          type = "client";
      }

      const createdAt = new Date(contract.createdAt);
      const diffMs = Date.now() - createdAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      let time = "";
      if (diffMins < 60) time = `${diffMins}m ago`;
      else if (diffMins < 1440) time = `${Math.floor(diffMins / 60)}h ago`;
      else time = `${Math.floor(diffMins / 1440)}d ago`;

      return { id: idx + 1, text, time, type };
    });

    // Vehicle availability for donut chart
    const vehicleAvailabilityData = [
      { name: "Available", value: availableUnits, color: "#22C55E" },
      { name: "Rented", value: rentedUnits, color: "#3B82F6" },
      { name: "Reserved", value: 0, color: "#F59E0B" },
      { name: "Maintenance", value: maintenanceUnits, color: "#E53935" },
    ];

    return NextResponse.json({
      stats: {
        totalRevenue: `AED ${revenueThisMonth.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, // Show this month's revenue cleanly formatted
        activeRentals: String(activeContracts),
        totalCustomers: String(totalClients),
        totalDrivers: String(totalDrivers),
        totalVehicles: String(totalUnits),
        availableVehicles: String(availableUnits),
        rentedVehicles: String(rentedUnits),
        vehiclesInMaintenance: String(maintenanceUnits),
        completedRentals: String(completedContracts),
        overdueRentals: String(overdueContracts),
        totalRentals: String(totalContracts),
        damagesReported: "0",
        depositsPending: "AED 0",
        changes,
      },
      rentalsPerMonthData,
      revenueData,
      vehicleAvailabilityData,
      mostRentedCarsData,
      recentActivity: formattedActivity,
      upcomingReturns,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to load dashboard data", message: (error as Error).message },
      { status: 500 }
    );
  }
}

