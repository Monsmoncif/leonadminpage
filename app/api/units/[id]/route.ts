export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Driver } from "@/models/Driver";
import { Inspection } from "@/models/Inspection";
import { syncUnitStatuses } from "@/lib/unit-status";
import { clearPdfCache } from "@/lib/pdf-cache";
import { mergeHandoverAndReturnImages, hasAnyValidPhotos } from "@/lib/unit-images";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    await syncUnitStatuses(id);

    // Ensure models are registered for population
    const _c = Client;
    const _d = Driver;

    // Fetch the unit, contracts summary, and latest handover/return photo sources in parallel.
    const [unit, allContracts, latestHandoverContract, latestReturnContract] = await Promise.all([
      Unit.findById(id).lean(),
      Contract.find({ unitId: id })
        .select("-adminSignature -customerSignature -returnCustomerSignature -inspectionPhotos -returnPhotos -damagePhotos -moneyPhotos -returnMoneyPhotos -privacyConsentDoc")
        .sort({ startDate: -1, createdAt: -1 })
        .populate({
          path: "clientId",
          select: "name firstName lastName phone nationality idNumber email clientType"
        })
        .populate({
          path: "driverId",
          select: "name phone"
        })
        .lean(),
      Contract.findOne({
        unitId: id,
        status: { $ne: "Cancelled" },
        inspectionPhotos: { $elemMatch: { $nin: [null, ""] } },
      })
        .sort({ deliveredAt: -1, handoverCompletedAt: -1, startDate: -1, createdAt: -1 })
        .select("inspectionPhotos deliveredAt handoverCompletedAt updatedAt")
        .lean(),
      Contract.findOne({
        unitId: id,
        status: { $ne: "Cancelled" },
        returnPhotos: { $elemMatch: { $nin: [null, ""] } },
      })
        .sort({ returnedAt: -1, updatedAt: -1, startDate: -1, createdAt: -1 })
        .select("returnPhotos returnedAt updatedAt")
        .lean(),
    ]);
    if (!unit) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Merge all existing pictures from the latest Handover and latest Return so partial returns
    // (e.g. only taking an odometer photo) never hide the rest of the vehicle's photos.
    try {
      let handoverPhotos: unknown[] = Array.isArray((latestHandoverContract as any)?.inspectionPhotos)
        ? (latestHandoverContract as any).inspectionPhotos
        : [];
      let returnPhotos: unknown[] = Array.isArray((latestReturnContract as any)?.returnPhotos)
        ? (latestReturnContract as any).returnPhotos
        : [];

      let handoverTs = latestHandoverContract
        ? new Date(
            (latestHandoverContract as any).handoverCompletedAt ||
              (latestHandoverContract as any).deliveredAt ||
              (latestHandoverContract as any).updatedAt ||
              0
          ).getTime()
        : 0;
      let returnTs = latestReturnContract
        ? new Date(
            (latestReturnContract as any).returnedAt ||
              (latestReturnContract as any).updatedAt ||
              0
          ).getTime()
        : 0;

      if (!hasAnyValidPhotos(handoverPhotos)) {
        const beforeInsp = (await Inspection.findOne({
          unitId: id,
          type: "Before Rental",
          photos: { $elemMatch: { $nin: [null, ""] } },
        })
          .sort({ date: -1, createdAt: -1 })
          .select("photos date updatedAt")
          .lean()) as any;
        if (beforeInsp && hasAnyValidPhotos(beforeInsp.photos)) {
          handoverPhotos = beforeInsp.photos;
          handoverTs = Math.max(
            handoverTs,
            new Date(beforeInsp.updatedAt || beforeInsp.date || 0).getTime()
          );
        }
      }

      if (!hasAnyValidPhotos(returnPhotos)) {
        const afterInsp = (await Inspection.findOne({
          unitId: id,
          type: "After Rental",
          photos: { $elemMatch: { $nin: [null, ""] } },
        })
          .sort({ date: -1, createdAt: -1 })
          .select("photos date updatedAt")
          .lean()) as any;
        if (afterInsp && hasAnyValidPhotos(afterInsp.photos)) {
          returnPhotos = afterInsp.photos;
          returnTs = Math.max(
            returnTs,
            new Date(afterInsp.updatedAt || afterInsp.date || 0).getTime()
          );
        }
      }

      const manualTs = (unit as any).imagesUpdatedManuallyAt
        ? new Date((unit as any).imagesUpdatedManuallyAt).getTime()
        : 0;
      const latestContractPhotoTs = Math.max(handoverTs, returnTs);

      if (
        (hasAnyValidPhotos(handoverPhotos) || hasAnyValidPhotos(returnPhotos)) &&
        latestContractPhotoTs >= manualTs
      ) {
        const existingImages: string[] = Array.isArray((unit as any).images)
          ? (unit as any).images.filter((u: unknown) => typeof u === "string" && u.trim() !== "")
          : [];
        const mergedImages = mergeHandoverAndReturnImages({
          handoverPhotos,
          returnPhotos,
          fallbackUnitImages: existingImages,
        });

        if (mergedImages.length > 0) {
          (unit as any).images = mergedImages;
          const differsFromStored =
            mergedImages.length !== existingImages.length ||
            mergedImages.some((u, idx) => u !== existingImages[idx]);
          if (differsFromStored) {
            await Unit.findByIdAndUpdate(id, { $set: { images: mergedImages } });
          }
        }
      }
    } catch (photoMergeErr) {
      console.warn("Could not merge handover and return photos on unit details:", photoMergeErr);
    }

    // Build mileage history from real contract data (Completed & Active)
    const contracts = allContracts
      .filter((c: any) => ["Completed", "Active"].includes(c.status))
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Build mileage history from real contract data
    const mileageHistory: { name: string; km: number; date: string }[] = [];

    for (const contract of contracts as any[]) {
      const startDate = new Date(contract.startDate);
      const startLabel = startDate.toLocaleDateString("en-GB", {
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
        const endLabel = endDate.toLocaleDateString("en-GB", {
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

    // Also include vidange history checkpoints in mileage progression
    if (Array.isArray((unit as any).vidangeHistory)) {
      for (const v of (unit as any).vidangeHistory) {
        if (v && v.mileage != null && v.date) {
          const vDate = new Date(v.date);
          if (!isNaN(vDate.getTime())) {
            mileageHistory.push({
              name: vDate.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
              km: Number(v.mileage),
              date: vDate.toISOString(),
            });
          }
        }
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

    return NextResponse.json({ ...unit, mileageHistory: finalHistory, contracts: allContracts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    await connectDB();
    
    const updatePayload: any = { ...body };
    if (Array.isArray(body.images)) {
      updatePayload.images = body.images.filter((u: unknown) => typeof u === "string" && u.trim() !== "");
      updatePayload.imagesUpdatedManuallyAt = new Date();
    }

    const unit = await Unit.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
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
        contract.handoverEmailSent = false;
        contract.handoverEmailSentAt = null;
        contract.handoverEmailSentTo = "";
          
        await contract.save();
      }
    }

    // Touch associated contracts and invalidate PDF cache so vehicle edits reflect immediately
    try {
      const objId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
      await Contract.updateMany(
        { $or: [{ unitId: id }, ...(objId ? [{ unitId: objId }] : [])] },
        { $set: { updatedAt: new Date() } }
      );
      const associatedContracts = await Contract.find({
        $or: [{ unitId: id }, ...(objId ? [{ unitId: objId }] : [])]
      }).select("_id contractNumber").lean();
      for (const c of associatedContracts) {
        clearPdfCache(c._id.toString());
        if (c.contractNumber) {
          clearPdfCache(String(c.contractNumber));
        }
      }
    } catch (touchErr) {
      console.warn("Could not bump contract updatedAt on unit update:", touchErr);
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
