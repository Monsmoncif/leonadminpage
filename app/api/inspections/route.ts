export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Inspection } from "@/models/Inspection";
import { Contract } from "@/models/Contract";
import { Unit } from "@/models/Unit";
import { User } from "@/models/User";

export async function GET() {
  try {
    await connectDB();
    
    // Explicitly import models to register their schemas in mongoose
    // to prevent Mongoose error: Schema hasn't been registered for model "Unit" / "User" / "Contract"
    const _c = Contract;
    const _u = Unit;
    const _d = User;

    const inspections = await Inspection.find({})
      .populate("contractId")
      .populate("unitId")
      .populate("driverId")
      .sort({ createdAt: -1 });

    return NextResponse.json(inspections, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching inspections:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inspections" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // Auto-generate inspection ID
    const latest = await Inspection.findOne().sort({ createdAt: -1 });
    let newId = "INSP-1001";
    if (latest && latest.inspectionId) {
      const match = latest.inspectionId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]) + 1;
        newId = `INSP-${num.toString().padStart(4, "0")}`;
      }
    }

    const newInspection = await Inspection.create({
      ...body,
      inspectionId: newId,
    });

    return NextResponse.json(newInspection, { status: 201 });
  } catch (error: any) {
    console.error("Error creating inspection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create inspection" },
      { status: 500 }
    );
  }
}

