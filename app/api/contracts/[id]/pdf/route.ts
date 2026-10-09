export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generateContractPdfFromPrintUrl, generateContractPdf } from "@/lib/pdf-generator";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";

// In-memory cache for fast repeated and prefetched downloads
export const pdfCache = new Map<string, { buffer: Buffer; updatedAt?: string; timestamp: number }>();
export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearPdfCache(contractId?: string) {
  if (contractId) {
    pdfCache.delete(contractId);
    console.log(`[PdfCache] Cleared PDF cache for contract ${contractId}`);
  } else {
    pdfCache.clear();
    console.log("[PdfCache] Cleared all PDF cache");
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing contract id" }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import("mongoose")).default;
    let contract: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      contract = await Contract.findById(id)
        .populate({ path: "clientId", strictPopulate: false })
        .populate({ path: "unitId", strictPopulate: false })
        .lean();
    }
    if (!contract && !isNaN(Number(id))) {
      contract = await Contract.findOne({ contractNumber: Number(id) })
        .populate({ path: "clientId", strictPopulate: false })
        .populate({ path: "unitId", strictPopulate: false })
        .lean();
    }

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const contractNum = contract.contractNumber || contract._id.toString().substring(0, 8).toUpperCase();
    const contractUpdatedAt = contract.updatedAt ? new Date(contract.updatedAt).toISOString() : "";

    const url = new URL(req.url);
    const forceFresh = url.searchParams.get("fresh") === "1" || url.searchParams.has("t");

    // 1. Check in-memory cache for instant 0ms return if not explicitly asking for fresh
    if (!forceFresh) {
      const cached = pdfCache.get(id);
      if (
        cached &&
        (!contractUpdatedAt || cached.updatedAt === contractUpdatedAt) &&
        Date.now() - cached.timestamp < CACHE_TTL_MS
      ) {
        return new NextResponse(new Uint8Array(cached.buffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Contract-${contractNum}.pdf"`,
            "Cache-Control": "public, max-age=3600",
            "X-PDF-Cache": "HIT",
          },
        });
      }
    }

    // 2. Prepare fallback data for instant reliability
    const clientDoc = contract.clientId || {};
    const unitDoc = contract.unitId || {};
    const fallbackData = {
      contractNumber: contractNum,
      clientName: clientDoc.name || "Customer",
      clientPhone: clientDoc.phone || "",
      clientEmail: clientDoc.email || "",
      clientIdNumber: clientDoc.idNumber || clientDoc.passportNumber || "",
      clientType: clientDoc.clientType || (clientDoc.idNumber ? "Resident" : "Tourist"),
      clientLicense: clientDoc.licenseNumber || clientDoc.driverLicense || "",
      vehicleName: unitDoc.make ? `${unitDoc.make} ${unitDoc.model}` : "Vehicle",
      vehiclePlate: unitDoc.plate || "",
      vehicleColor: unitDoc.color || "",
      vehicleYear: unitDoc.year || "",
      checkoutMileage: contract.checkoutMileage || contract.startMileage || 0,
      checkoutFuelLevel: contract.checkoutFuelLevel !== undefined ? Number(contract.checkoutFuelLevel) : 100,
      startDate: new Date(contract.startDate).toLocaleDateString("en-GB"),
      endDate: new Date(contract.endDate).toLocaleDateString("en-GB"),
      status: contract.status,
      deliveryStatus: contract.deliveryStatus,
      returnedAt: contract.returnedAt || contract.updatedAt,
      totalDays: contract.totalDays || 1,
      dailyRate: contract.dailyRate || (contract.totalDays ? Math.round(contract.totalAmount / contract.totalDays) : contract.totalAmount),
      depositAmount: contract.depositAmount || 0,
      totalAmount: contract.totalAmount || 0,
      paymentMethod: contract.paymentMethod || "Cash",
      salikCharge: Number(contract.salikCharge || contract.salikFees || 0),
      parkingCharge: Number(contract.parkingCharge || contract.parkingFees || 0),
      finesCharge: Number(contract.finesCharge || contract.finesFees || 0),
      fuelCharge: Number(contract.fuelCharge || contract.fuelFees || 0),
      notes: contract.notes || "",
      customerSignature: contract.customerSignature || contract.signature,
      createdAt: new Date(contract.createdAt || Date.now()).toLocaleDateString("en-GB"),
    };

    // 3. Generate PDF (exact browser print page or PDFKit fallback)
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateContractPdfFromPrintUrl(id, fallbackData);
    } catch {
      pdfBuffer = await generateContractPdf(fallbackData);
    }

    // 4. Save to cache
    pdfCache.set(id, {
      buffer: pdfBuffer,
      updatedAt: contractUpdatedAt,
      timestamp: Date.now(),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Contract-${contractNum}.pdf"`,
        "Cache-Control": "public, max-age=3600",
        "X-PDF-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("[ContractPdfRoute] Error rendering PDF:", error);
    return NextResponse.json({ error: error.message || "Failed to generate PDF" }, { status: 500 });
  }
}
