export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Client } from "@/models/Client";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import { Driver } from "@/models/Driver";

const emptyResponse = {
  stats: {
    totalRevenue: "$0",
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
    depositsPending: "$0",
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

    // Date calculations for changes (This month vs Last month)
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const selectedYear = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Run all queries in parallel for speed
    const [
      totalUnits,
      availableUnits,
      rentedUnits,
      maintenanceUnits,
      totalClients,
      totalDrivers,
      totalContracts,
      activeContracts,
      completedContracts,
      cancelledContracts,
      overdueContracts,
      recentContracts,
      recentActivity,
      
      // Historical data for percentage changes
      clientsThisMonth,
      clientsLastMonth,
      unitsThisMonth,
      unitsLastMonth,
      contractsThisMonth,
      contractsLastMonth,
    ] = await Promise.all([
      Unit.countDocuments(),
      Unit.countDocuments({ status: "Available" }),
      Unit.countDocuments({ status: "Rented" }),
      Unit.countDocuments({ status: "Maintenance" }),
      Client.countDocuments(),
      Driver.countDocuments(),
      Contract.countDocuments(),
      Contract.countDocuments({ status: "Active" }),
      Contract.countDocuments({ status: "Completed" }),
      Contract.countDocuments({ status: "Cancelled" }),
      Contract.countDocuments({ status: "Active", endDate: { $lt: new Date() } }),
      Contract.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("clientId", "name")
        .populate("unitId", "make model plate")
        .populate("driverId", "name")
        .lean(),
      Contract.find()
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("clientId", "name")
        .populate("unitId", "make model plate")
        .lean(),
        
      // For changes
      Client.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      Client.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Unit.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      Unit.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Contract.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      Contract.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    ]);

    // Calculate this month's revenue properly (excluding damage charges which go directly to mechanic/repairs)
    const revenueThisMonthResult = await Contract.aggregate([
      { 
        $match: { 
          $or: [
            // Contracts completed this month (full amount earned)
            { status: "Completed", updatedAt: { $gte: startOfThisMonth } },
            // Active contracts that started this month (deposit collected)
            { status: "Active", startDate: { $gte: startOfThisMonth } }
          ]
        }
      },
      { 
        $group: { 
          _id: null, 
          total: { 
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$totalAmount", 0] },
                    { $ifNull: ["$damageCharge", 0] }
                  ]
                }
              ]
            } 
          } 
        } 
      },
    ]);
    const revenueThisMonth = revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0;

    // Calculate last month's revenue for comparison (excluding damage charges)
    const revenueLastMonthResult = await Contract.aggregate([
      { 
        $match: { 
          $or: [
            // Contracts completed last month (full amount earned)
            { status: "Completed", updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
            // Active contracts that started last month (deposit collected)
            { status: "Active", startDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } }
          ]
        }
      },
      { 
        $group: { 
          _id: null, 
          total: { 
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$totalAmount", 0] },
                    { $ifNull: ["$damageCharge", 0] }
                  ]
                }
              ]
            } 
          } 
        } 
      },
    ]);
    const revenueLastMonth = revenueLastMonthResult.length > 0 ? revenueLastMonthResult[0].total : 0;

    // Calculate total lifetime revenue for context (excluding damage charges)
    const totalRevenueResult = await Contract.aggregate([
      { $match: { status: { $in: ["Active", "Completed"] } } },
      { 
        $group: { 
          _id: null, 
          total: { 
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$totalAmount", 0] },
                    { $ifNull: ["$damageCharge", 0] }
                  ]
                }
              ]
            } 
          } 
        } 
      },
    ]);
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

    // Contracts per month (for bar chart)
    const startOfSelectedYear = new Date(selectedYear, 0, 1);
    const endOfSelectedYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const contractsPerMonth = await Contract.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfSelectedYear, $lte: endOfSelectedYear } 
        } 
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rentalsPerMonthData = monthNames.map((month, idx) => {
      const found = contractsPerMonth.find((c: any) => c._id === idx + 1);
      return { month, rentals: found ? found.count : 0 };
    });

    // Revenue per month (for line chart) - excluding damage charges
    const revenuePerMonth = await Contract.aggregate([
      { $match: { status: { $in: ["Active", "Completed"] } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { 
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$totalAmount", 0] },
                    { $ifNull: ["$damageCharge", 0] }
                  ]
                }
              ]
            } 
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueData = monthNames.map((month, idx) => {
      const found = revenuePerMonth.find((r: any) => r._id === idx + 1);
      return { month, revenue: found ? found.revenue : 0 };
    });

    // Most rented vehicles
    const mostRented = await Contract.aggregate([
      {
        $group: {
          _id: "$unitId",
          count: { $sum: 1 },
        },
      },
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
    ]);

    const mostRentedCarsData = mostRented.map((item: any) => ({
      name: item.unit ? `${item.unit.make} ${item.unit.model}` : "Unknown Vehicle",
      value: item.count,
    }));

    // Upcoming returns (active contracts ending soonest)
    const upcomingReturnsRaw = await Contract.find({ status: "Active" })
      .sort({ endDate: 1 })
      .limit(4)
      .populate("clientId", "name")
      .populate("unitId", "make model plate")
      .lean();

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
        dueDate: isToday ? "Today" : isTomorrow ? "Tomorrow" : endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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
        totalRevenue: `$${revenueThisMonth.toLocaleString()}`, // Changed to show this month's revenue
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
        depositsPending: "$0",
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

