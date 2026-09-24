export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Damage } from "@/models/Damage";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const damage = await Damage.findById(id).populate("unitId contractId");
    
    if (!damage) {
      return NextResponse.json({ error: "Damage not found" }, { status: 404 });
    }
    
    return NextResponse.json(damage, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    
    const damage = await Damage.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate("unitId contractId");
    
    if (!damage) {
      return NextResponse.json({ error: "Damage not found" }, { status: 404 });
    }

    if (damage.unitId) {
      const unitId = damage.unitId._id || damage.unitId;
      if (damage.status === "Pending") {
        await Unit.findByIdAndUpdate(unitId, { status: "Maintenance" });
      } else if (damage.status === "Repaired") {
        await Unit.findByIdAndUpdate(unitId, { status: "Available" });
      }
    }

    // If cost was updated and this damage is associated with a contract, sync contract damageCharge & totalAmount
    if (damage.contractId && body.cost !== undefined) {
      const cId = damage.contractId._id || damage.contractId;
      const allContractDamages = await Damage.find({ contractId: cId });
      const totalDamageCharge = allContractDamages.reduce((sum, d) => sum + (Number(d.cost) || 0), 0);
      const targetContract = await Contract.findById(cId);
      if (targetContract) {
        targetContract.damageCharge = totalDamageCharge;
        const totalDays = targetContract.totalDays || 1;
        const dailyRateVal = targetContract.dailyRate || 0;
        targetContract.totalAmount = (totalDays * dailyRateVal) +
          (targetContract.babySeatFees || 0) +
          (targetContract.tintingFees || 0) +
          (targetContract.deliveryCharges || 0) +
          (targetContract.salikFees || 0) +
          (targetContract.cleaningFees || 0) +
          (targetContract.extraKmCharge || 0) +
          totalDamageCharge;
        await targetContract.save();
      }
    }
    
    return NextResponse.json(damage, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const damage = await Damage.findByIdAndDelete(id);
    
    if (!damage) {
      return NextResponse.json({ error: "Damage not found" }, { status: 404 });
    }

    if (damage.status === "Pending" && damage.unitId) {
      await Unit.findByIdAndUpdate(damage.unitId, { status: "Available" });
    }
    
    return NextResponse.json({ message: "Damage deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
