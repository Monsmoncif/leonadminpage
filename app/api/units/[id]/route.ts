export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    const unit = await Unit.findById(id).lean();
    if (!unit) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // جلب العقود المرتبطة بهذه المركبة (مكتملة أو نشطة) لبناء تاريخ الكيلومترات الحقيقي
    const contracts = await Contract.find({
      unitId: id,
      status: { $in: ["Completed", "Active"] },
    })
      .sort({ startDate: 1 })
      .select("startDate endDate checkoutMileage returnOdometer status")
      .lean();

    // Build mileage history from real contract data
    const mileageHistory: { name: string; km: number; date: string }[] = [];

    for (const contract of contracts as any[]) {
      const startDate = new Date(contract.startDate);
      const startLabel = startDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      // Always include checkout mileage as starting baseline (even if 0)
      if (contract.checkoutMileage != null) {
        mileageHistory.push({
          name: startLabel,
          km: Number(contract.checkoutMileage),
          date: contract.startDate,
        });
      }

      // Add return odometer point if car was returned
      if (contract.returnOdometer != null && contract.returnOdometer > 0) {
        const endDate = new Date(contract.endDate);
        const endLabel = endDate.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        mileageHistory.push({
          name: endLabel,
          km: Number(contract.returnOdometer),
          date: contract.endDate,
        });
      }
    }

    // Sort ascending by date
    mileageHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Deduplicate: if same date label exists, keep the highest km value
    const deduped = mileageHistory.reduce((acc: any[], cur) => {
      const existing = acc.find((x) => x.name === cur.name && x.date === cur.date);
      if (existing) {
        if (cur.km > existing.km) existing.km = cur.km;
      } else {
        acc.push({ ...cur });
      }
      return acc;
    }, []);

    // If no history at all, show current mileage as single point
    const finalHistory =
      deduped.length === 0
        ? [{ name: "Current", km: (unit as any).mileage || 0 }]
        : deduped;

    return NextResponse.json({ ...unit, mileageHistory: finalHistory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    await connectDB();
    
    const unit = await Unit.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!unit) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Sync price changes to Active and Draft contracts
    if (body.dailyRate !== undefined || body.pricePerExtraKm !== undefined || body.dailyKmLimit !== undefined) {
      const activeContracts = await Contract.find({ 
        unitId: id, 
        status: { $in: ["Active", "Draft"] } 
      });

      for (const contract of activeContracts) {
        if (body.dailyRate !== undefined) contract.dailyRate = Number(body.dailyRate);
        if (body.pricePerExtraKm !== undefined) contract.pricePerExtraKm = Number(body.pricePerExtraKm);
        if (body.dailyKmLimit !== undefined) contract.dailyKmLimit = Number(body.dailyKmLimit);
        
        // Recalculate totalAmount
        contract.totalAmount = (contract.totalDays * contract.dailyRate) + 
          (contract.babySeatFees || 0) + 
          (contract.tintingFees || 0) + 
          (contract.deliveryCharges || 0) + 
          (contract.salikFees || 0) + 
          (contract.cleaningFees || 0) + 
          (contract.extraKmCharge || 0) + 
          (contract.damageCharge || 0);
          
        await contract.save();
      }
    }

    return NextResponse.json(unit);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Vehicle with this plate or VIN already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    
    const unit = await Unit.findByIdAndDelete(id);
    if (!unit) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Vehicle deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
