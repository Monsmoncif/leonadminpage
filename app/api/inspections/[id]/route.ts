export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Inspection } from "@/models/Inspection";
import { Contract } from "@/models/Contract";
import { Unit } from "@/models/Unit";
import { Driver } from "@/models/Driver";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const resolvedParams = await params;

    // Ensure models are registered
    const _c = Contract;
    const _u = Unit;
    const _d = Driver;

    const inspection = await Inspection.findById(resolvedParams.id)
      .populate("contractId")
      .populate("unitId")
      .populate("driverId");

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(inspection, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching inspection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inspection" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const body = await request.json();

    const updatedInspection = await Inspection.findByIdAndUpdate(
      resolvedParams.id,
      body,
      { new: true, runValidators: true }
    );

    if (!updatedInspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedInspection, { status: 200 });
  } catch (error: any) {
    console.error("Error updating inspection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update inspection" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const deletedInspection = await Inspection.findByIdAndDelete(resolvedParams.id);

    if (!deletedInspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Inspection deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting inspection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete inspection" },
      { status: 500 }
    );
  }
}
