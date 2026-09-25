import { NextResponse } from "next/server";
import { generateContractPdfFromPrintUrl } from "@/lib/pdf-generator";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";

// In-memory cache for fast repeated and prefetched downloads
const pdfCache = new Map<string, { buffer: Buffer; updatedAt?: string; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
    const contract = await Contract.findById(id).select("contractNumber updatedAt").lean() as any;
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const contractNum = contract.contractNumber || contract._id.toString().substring(0, 8).toUpperCase();
    const contractUpdatedAt = contract.updatedAt ? new Date(contract.updatedAt).toISOString() : "";

    // 1. Check in-memory cache for instant 0ms return
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

    // 2. Generate PDF
    const pdfBuffer = await generateContractPdfFromPrintUrl(id);

    // 3. Save to cache
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
