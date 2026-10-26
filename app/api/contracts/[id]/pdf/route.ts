export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generateContractPdfFromPrintUrl, generateContractPdf, clearPdfJobs } from "@/lib/pdf-generator";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { formatDateDMY } from "@/lib/date-utils";

// In-memory cache for fast repeated and prefetched downloads
export const pdfCache = new Map<string, { buffer: Buffer; updatedAt?: string; clientUpdatedAt?: string; timestamp: number }>();
export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearPdfCache(contractId?: string) {
  if (contractId) {
    pdfCache.delete(contractId);
    clearPdfJobs(contractId);
    console.log(`[PdfCache] Cleared PDF cache and jobs for contract ${contractId}`);
  } else {
    pdfCache.clear();
    clearPdfJobs();
    console.log("[PdfCache] Cleared all PDF cache and jobs");
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
    const clientDoc = contract.clientId || {};
    const clientUpdatedAt = clientDoc?.updatedAt ? new Date(clientDoc.updatedAt).toISOString() : "";

    const url = new URL(req.url);
    const forceFresh = url.searchParams.get("fresh") === "1" || url.searchParams.has("t");

    if (forceFresh) {
      clearPdfCache(id);
      if (contract.contractNumber) {
        clearPdfCache(String(contract.contractNumber));
      }
    }

    // 1. Check in-memory cache for instant return if not explicitly asking for fresh
    if (!forceFresh) {
      const cached = pdfCache.get(id);
      if (
        cached &&
        (!contractUpdatedAt || cached.updatedAt === contractUpdatedAt) &&
        (!clientUpdatedAt || cached.clientUpdatedAt === clientUpdatedAt) &&
        Date.now() - cached.timestamp < CACHE_TTL_MS
      ) {
        return new NextResponse(new Uint8Array(cached.buffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Contract-${contractNum}.pdf"`,
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-PDF-Cache": "HIT",
          },
        });
      }
    }

    // 2. Prepare fallback data for instant reliability
    const unitDoc = contract.unitId || {};
    const isPersonalized = Boolean(
      contract.contractType === "Personalized" ||
      contract.personalizedPersonName ||
      contract.deliveryDriver === "Personal Use"
    );

    const hasEmiratesId = Boolean(
      clientDoc.idNumber && (
        clientDoc.idNumber.startsWith("784-") ||
        /^\d{3}-\d{4}-\d{7}-\d{1}$/.test(clientDoc.idNumber)
      )
    );
    const isForeigner = Boolean(
      clientDoc.clientType === "Tourist" ||
      clientDoc.passportNumber ||
      (clientDoc.licenseIssuedBy && !["uae", "dubai", "abu dhabi", "sharjah", "ajman", "fujairah", "rak", "uaq", "united arab emirates"].includes(clientDoc.licenseIssuedBy.toLowerCase().trim())) ||
      (clientDoc.nationality && !["uae", "united arab emirates", "emirati", "إماراتي"].includes(clientDoc.nationality.toLowerCase().trim()) && !hasEmiratesId)
    );

    const fallbackData = {
      contractNumber: contractNum,
      clientName: isPersonalized 
        ? (contract.personalizedPersonName || clientDoc.name || "Customer") 
        : (clientDoc.name || contract.personalizedPersonName || contract.customer || "Customer"),
      clientPhone: clientDoc.phone || "",
      clientEmail: clientDoc.email || "",
      clientIdNumber: clientDoc.idNumber || clientDoc.passportNumber || "",
      clientType: isForeigner ? "Tourist" : (clientDoc.clientType || "Resident"),
      clientLicense: clientDoc.licenseNumber || clientDoc.driverLicense || "",
      licenseIssuedBy: clientDoc.licenseIssuedBy || clientDoc.licenseIssuedAt || "",
      licenseIssuedDate: clientDoc.licenseIssuedDate ? formatDateDMY(clientDoc.licenseIssuedDate) : "",
      licenseExpiry: clientDoc.licenseExpiry ? formatDateDMY(clientDoc.licenseExpiry) : "",
      internationalLicenseNumber: clientDoc.internationalLicenseNumber || "",
      passportNumber: clientDoc.passportNumber || (isForeigner ? clientDoc.idNumber : ""),
      passportIssuedBy: clientDoc.passportIssuedBy || (isForeigner ? clientDoc.nationality : ""),
      passportExpiry: clientDoc.passportExpiry ? formatDateDMY(clientDoc.passportExpiry) : (isForeigner && clientDoc.idExpiry ? formatDateDMY(clientDoc.idExpiry) : ""),
      nationality: clientDoc.nationality || "",
      documents: Array.isArray(clientDoc.documents) ? clientDoc.documents : [],
      vehicleName: unitDoc.make ? `${unitDoc.make} ${unitDoc.model}` : "Vehicle",
      vehiclePlate: unitDoc.plate || "",
      vehicleColor: unitDoc.color || "",
      vehicleYear: unitDoc.year || "",
      checkoutMileage: contract.checkoutMileage || contract.startMileage || 0,
      checkoutFuelLevel: contract.checkoutFuelLevel !== undefined ? Number(contract.checkoutFuelLevel) : 100,
      startDate: formatDateDMY(contract.startDate),
      endDate: formatDateDMY(contract.endDate),
      status: contract.status,
      deliveryStatus: contract.deliveryStatus,
      returnedAt: contract.returnedAt || contract.updatedAt,
      totalDays: contract.totalDays || 1,
      dailyRate: isPersonalized ? 0 : (contract.dailyRate || (contract.totalDays ? Math.round(contract.totalAmount / contract.totalDays) : contract.totalAmount)),
      depositAmount: isPersonalized ? 0 : (contract.depositAmount || 0),
      totalAmount: isPersonalized ? 0 : (contract.totalAmount || 0),
      paymentMethod: isPersonalized ? "Personal / Free" : (contract.paymentMethod || "Cash"),
      salikCharge: isPersonalized ? 0 : Number(contract.salikCharge || contract.salikFees || 0),
      parkingCharge: isPersonalized ? 0 : Number(contract.parkingCharge || contract.parkingFees || 0),
      finesCharge: isPersonalized ? 0 : Number(contract.finesCharge || contract.finesFees || 0),
      fuelCharge: isPersonalized ? 0 : Number(contract.fuelCharge || contract.fuelFees || 0),
      notes: contract.notes || "",
      customerSignature: contract.customerSignature || contract.signature,
      createdAt: formatDateDMY(contract.createdAt || Date.now()),
    };

    // 3. Generate PDF from the real /bookings/[id]/print page
    const pdfBuffer: Buffer = await generateContractPdfFromPrintUrl(id, fallbackData);

    // 4. Save to cache
    pdfCache.set(id, {
      buffer: pdfBuffer,
      updatedAt: contractUpdatedAt,
      clientUpdatedAt,
      timestamp: Date.now(),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Contract-${contractNum}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-PDF-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("[ContractPdfRoute] Error rendering PDF:", error);
    return NextResponse.json({ error: error.message || "Failed to generate PDF" }, { status: 500 });
  }
}
