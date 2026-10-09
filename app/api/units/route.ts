export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";
import { syncUnitStatuses } from "@/lib/unit-status";

const emptyResponse = {
  units: [],
  stats: {
    totalVehicles: 0,
    availableVehicles: 0,
    rentedVehicles: 0,
    vehiclesInMaintenance: 0,
  }
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // 1. Synchronize vehicle statuses based on today's active contracts
    await syncUnitStatuses();

    // 2. Fetch all units
    const units = await Unit.find().sort({ createdAt: -1 }).lean();

    // 3. Fetch active/draft contracts to attach upcoming bookings
    const activeContracts = await Contract.find({
      status: { $in: ["Active", "Draft"] },
      deliveryStatus: { $ne: "Returned" },
    })
      .select("_id contractNumber unitId startDate endDate status")
      .lean();

    const bookingsByUnit: Record<string, any[]> = {};
    for (const c of activeContracts) {
      if (!c.unitId) continue;
      const uid = c.unitId.toString();
      if (!bookingsByUnit[uid]) bookingsByUnit[uid] = [];
      bookingsByUnit[uid].push({
        contractId: c._id.toString(),
        contractNumber: c.contractNumber,
        startDate: c.startDate,
        endDate: c.endDate,
        status: c.status,
      });
    }

    const unitsWithBookings = units.map((u: any) => ({
      ...u,
      activeBookings: bookingsByUnit[u._id.toString()] || [],
    }));
    
    const stats = {
      totalVehicles: unitsWithBookings.length,
      availableVehicles: unitsWithBookings.filter((u: any) => u.status === "Available").length,
      rentedVehicles: unitsWithBookings.filter((u: any) => u.status === "Rented").length,
      vehiclesInMaintenance: unitsWithBookings.filter((u: any) => u.status === "Maintenance").length,
    };

    return NextResponse.json({ units: unitsWithBookings, stats });
  } catch (error: any) {
    console.warn("Units API: MongoDB not available, returning empty data.", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectDB();
    
    const mileageNum = Number(body.mileage) || 0;
    if (body.initialMileage === undefined || body.initialMileage === null) {
      body.initialMileage = mileageNum;
    }
    if (body.lastOilChangeMileage === undefined || body.lastOilChangeMileage === null || body.lastOilChangeMileage === 0) {
      body.lastOilChangeMileage = mileageNum;
    }
    if (!body.lastOilChangeDate) {
      body.lastOilChangeDate = new Date();
    }
    
    const unit = await Unit.create(body);
    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Vehicle with this plate or VIN already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

