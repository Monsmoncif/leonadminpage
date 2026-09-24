export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Unit } from "@/models/Unit";

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
    const units = await Unit.find().sort({ createdAt: -1 }).lean();
    
    const stats = {
      totalVehicles: units.length,
      availableVehicles: units.filter((u: any) => u.status === "Available").length,
      rentedVehicles: units.filter((u: any) => u.status === "Rented").length,
      vehiclesInMaintenance: units.filter((u: any) => u.status === "Maintenance").length,
    };

    return NextResponse.json({ units, stats });
  } catch (error: any) {
    console.warn("Units API: MongoDB not available, returning empty data.", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectDB();
    
    const unit = await Unit.create(body);
    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Vehicle with this plate or VIN already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

