export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";
import { syncUnitStatuses } from "@/lib/unit-status";
import { getBusinessEndOfDayUTC } from "@/lib/date-utils";

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

    // Sync unit statuses asynchronously so initial page loads never block on a write round trip
    void syncUnitStatuses();

    const isFull = req.nextUrl.searchParams.get("full") === "true";
    const isSlim = req.nextUrl.searchParams.get("slim") === "true";

    let unitsQuery = Unit.find().sort({ createdAt: -1 });
    if (isSlim) {
      unitsQuery = unitsQuery.select({
        make: 1,
        model: 1,
        plate: 1,
        year: 1,
        color: 1,
        category: 1,
        fuelType: 1,
        transmission: 1,
        seats: 1,
        mileage: 1,
        dailyRate: 1,
        weeklyRate: 1,
        monthlyRate: 1,
        status: 1,
        images: { $slice: 1 },
      });
    } else if (!isFull) {
      unitsQuery = unitsQuery.select({
        documents: 0,
        vidangeHistory: 0,
        images: { $slice: 1 },
      });
    }

    // Run Unit query and active Contract bookings lookup in parallel
    const [units, activeContracts] = await Promise.all([
      unitsQuery.lean(),
      Contract.find({
        status: { $in: ["Active", "Draft"] },
        deliveryStatus: { $ne: "Returned" },
      })
        .select("_id contractNumber unitId startDate endDate status deliveryStatus checkoutTime checkinTime returnedAt")
        .lean(),
    ]);

    const nowEndOfDay = getBusinessEndOfDayUTC();

    const bookingsByUnit: Record<string, any[]> = {};
    const rentedUnitSet = new Set<string>();
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
        checkoutTime: c.checkoutTime || "",
        checkinTime: c.checkinTime || "",
        returnedAt: c.returnedAt || null,
      });

      if (
        c.deliveryStatus === "Delivered" &&
        c.startDate &&
        c.endDate &&
        new Date(c.startDate) <= nowEndOfDay &&
        new Date(c.endDate) > nowEndOfDay
      ) {
        rentedUnitSet.add(uid);
      }
    }

    const unitsWithBookings = units.map((u: any) => {
      const uid = u._id.toString();
      const computedStatus =
        u.status === "Maintenance" || u.status === "Out of Service"
          ? u.status
          : rentedUnitSet.has(uid)
          ? "Rented"
          : "Available";

      return {
        ...u,
        status: computedStatus,
        activeBookings: bookingsByUnit[uid] || [],
      };
    });
    
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
    
    // Auto-generate fallback unique VIN if driver doesn't have the registration card
    const cleanPlate = (body.plate || "CAR").trim().toUpperCase().replace(/[^A-Za-z0-9]/g, "");
    if (!body.vin || !body.vin.trim()) {
      body.vin = `VN-${cleanPlate}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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

